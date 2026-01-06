import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';
import * as sharingService from '../access/sharing';
import * as consentService from '../access/consent';
import { createPermission, Permission, Action } from '../access/permissions';
import { logSharing } from '../middleware/audit';
import { AuditEventType } from '../audit/events';
import { onShareAccess } from '../hooks/alertHooks';

const router = Router();

/**
 * POST /api/v1/sharing/share
 * Create a share
 */
router.post('/share', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      resource_type,
      resource_id,
      share_type,
      expires_at,
      purpose,
      permissions
    } = req.body;

    if (!resource_type || !resource_id || !share_type || !permissions) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Missing required fields' }
      });
    }

    // Validate share type
    if (!['delegate', 'app', 'link'].includes(share_type)) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Invalid share_type' }
      });
    }

    // Parse permissions
    const parsedPermissions: Permission[] = permissions.map((p: any) =>
      createPermission(p.action as Action, p.conditions)
    );

    // Parse expiry
    let expiryDate: Date | undefined;
    if (expires_at) {
      expiryDate = new Date(expires_at);
      if (isNaN(expiryDate.getTime())) {
        return res.status(400).json({
          error: { code: 'INVALID_INPUT', message: 'Invalid expires_at date' }
        });
      }
    }

    // Create share
    const { shareId, token } = await sharingService.createShare({
      owner_id: userId,
      resource_type,
      resource_id,
      share_type,
      expires_at: expiryDate,
      purpose,
      permissions: parsedPermissions
    });

    // Create consent receipt if share_type is delegate
    if (share_type === 'delegate' && req.body.delegate_id) {
      await consentService.createConsent({
        user_id: userId,
        subject_id: req.body.delegate_id,
        resource_ids: [resource_id],
        purpose,
        expires_at: expiryDate
      });
    }

    // Log share creation
    await logSharing(req, AuditEventType.SHARE_CREATED, resource_type, resource_id, {
      share_type,
      share_id: shareId,
      expires_at: expiryDate
    });

    res.status(201).json({
      share_id: shareId,
      token,
      share_url: `/shared/${token}`,
      expires_at: expiryDate || null
    });
  } catch (error: any) {
    console.error('Create share error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create share' }
    });
  }
});

/**
 * GET /api/v1/sharing/shares
 * List active shares
 */
router.get('/shares', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const resource_type = req.query.resource_type as string;
    const resource_id = req.query.resource_id as string;

    const shares = await sharingService.listShares(userId, resource_type, resource_id);

    // Get permissions for each share
    const sharesWithPermissions = await Promise.all(
      shares.map(async (share) => {
        const permissions = await sharingService.getSharePermissions(share.id);
        return {
          id: share.id,
          resource_type: share.resource_type,
          resource_id: share.resource_id,
          share_type: share.share_type,
          expires_at: share.expires_at,
          purpose: share.purpose,
          permissions,
          created_at: share.created_at
        };
      })
    );

    res.json({ shares: sharesWithPermissions });
  } catch (error: any) {
    console.error('List shares error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list shares' }
    });
  }
});

/**
 * DELETE /api/v1/sharing/shares/:share_id
 * Revoke a share
 */
router.delete('/shares/:share_id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const shareId = req.params.share_id;

    // Get share before revoking (for logging)
    const share = await sharingService.getShareByToken(''); // We need share info
    const shares = await sharingService.listShares(userId);
    const shareToRevoke = shares.find(s => s.id === shareId);

    const revoked = await sharingService.revokeShare(shareId, userId);

    if (!revoked) {
      return res.status(404).json({
        error: { code: 'SHARE_NOT_FOUND', message: 'Share not found' }
      });
    }

    // Log share revocation
    if (shareToRevoke) {
      await logSharing(req, AuditEventType.SHARE_REVOKED, shareToRevoke.resource_type, shareToRevoke.resource_id);
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Revoke share error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke share' }
    });
  }
});

/**
 * POST /api/v1/sharing/access/:token
 * Access a shared resource
 */
router.post('/access/:token', async (req: Request, res: Response) => {
  try {
    const token = req.params.token;
    const { resource_type, resource_id, action, consent_granted } = req.body;

    if (!resource_type || !resource_id || !action) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Missing required fields' }
      });
    }

    // Check share access
    const accessCheck = await sharingService.checkShareAccess(token, {
      userId: '', // Not needed for share token access
      resourceType: resource_type,
      resourceId: resource_id,
      action: action as Action,
      context: {
        ipAddress: req.ip,
        timestamp: new Date()
      }
    });

    if (!accessCheck.allowed) {
      return res.status(403).json({
        error: { code: 'ACCESS_DENIED', message: accessCheck.reason || 'Access denied' }
      });
    }

    // Get share details
    const share = await sharingService.getShareByToken(token);
    if (!share) {
      return res.status(404).json({
        error: { code: 'SHARE_NOT_FOUND', message: 'Share not found' }
      });
    }

    // Record consent if provided
    if (consent_granted && share.share_type === 'delegate') {
      // Consent already created when share was created
      // But we can record access here for audit purposes
    }

    // Return resource data (will be fetched by caller based on resource_type and resource_id)
    res.json({
      resource_type: share.resource_type,
      resource_id: share.resource_id,
      permissions: accessCheck.permissions,
      expires_at: share.expires_at,
      purpose: share.purpose
    });
  } catch (error: any) {
    console.error('Access share error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to access share' }
    });
  }
});

/**
 * GET /api/v1/sharing/consents
 * List consents
 */
router.get('/consents', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const consents = await consentService.listConsents(userId);

    res.json({
      consents: consents.map(consent => ({
        id: consent.id,
        subject_id: consent.subject_id,
        resource_ids: consent.resource_ids,
        purpose: consent.purpose,
        granted_at: consent.granted_at,
        expires_at: consent.expires_at,
        withdrawn_at: consent.withdrawn_at,
        valid: consentService.isConsentValid(consent)
      }))
    });
  } catch (error: any) {
    console.error('List consents error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list consents' }
    });
  }
});

/**
 * POST /api/v1/sharing/consents/:consent_id/withdraw
 * Withdraw consent
 */
router.post('/consents/:consent_id/withdraw', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const consentId = req.params.consent_id;

    const withdrawn = await consentService.withdrawConsent(consentId, userId);

    if (!withdrawn) {
      return res.status(404).json({
        error: { code: 'CONSENT_NOT_FOUND', message: 'Consent not found or already withdrawn' }
      });
    }

    res.json({
      consent_id: consentId,
      withdrawn_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Withdraw consent error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to withdraw consent' }
    });
  }
});

/**
 * GET /api/v1/sharing/resources/:resource_id/consents
 * Get consent history for a resource
 */
router.get('/resources/:resource_id/consents', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const resourceId = req.params.resource_id;

    const consents = await consentService.getConsentHistory(userId, resourceId);

    res.json({
      consents: consents.map(consent => ({
        id: consent.id,
        subject_id: consent.subject_id,
        purpose: consent.purpose,
        granted_at: consent.granted_at,
        expires_at: consent.expires_at,
        withdrawn_at: consent.withdrawn_at,
        valid: consentService.isConsentValid(consent)
      }))
    });
  } catch (error: any) {
    console.error('Get consent history error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get consent history' }
    });
  }
});

export default router;

