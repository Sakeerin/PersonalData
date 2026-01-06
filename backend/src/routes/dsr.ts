import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { sensitiveOperationLimiter } from '../middleware/rateLimit';
import * as exportService from '../dsr/export';
import * as deletionService from '../dsr/deletion';
import * as retentionService from '../dsr/retention';
import * as consentService from '../access/consent';
import { logDataOperation, logSecurity } from '../middleware/audit';
import { AuditEventType } from '../audit/events';
import { onDataExport } from '../hooks/alertHooks';

const router = Router();

/**
 * POST /api/v1/dsr/export
 * Request data export (async job)
 */
router.post('/export', authenticate, sensitiveOperationLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const format = (req.query.format as 'zip' | 'json' | 'csv') || 'zip';

    const jobId = await exportService.createExportJob(userId, format);

    // Log export request
    await logDataOperation(req, AuditEventType.DATA_EXPORTED, 'user', userId, {
      format,
      job_id: jobId
    });

    // Check alert rules for burst exports
    await onDataExport(userId, format);

    // Process export asynchronously (in production, use a job queue)
    exportService.processExportJob(jobId, userId).catch(error => {
      console.error(`Export job ${jobId} failed:`, error);
    });

    res.status(202).json({
      job_id: jobId,
      status: 'pending',
      format,
      estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes estimate
    });
  } catch (error: any) {
    console.error('Create export error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create export job' }
    });
  }
});

/**
 * GET /api/v1/dsr/export/:job_id
 * Get export job status
 */
router.get('/export/:job_id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const jobId = req.params.job_id;

    const job = await exportService.getExportJob(jobId, userId);

    if (!job) {
      return res.status(404).json({
        error: { code: 'JOB_NOT_FOUND', message: 'Export job not found' }
      });
    }

    if (job.status === 'completed' && job.file_path) {
      res.json({
        job_id: job.id,
        status: job.status,
        format: job.format,
        download_url: `/api/v1/dsr/export/${jobId}/download`,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });
    } else if (job.status === 'failed') {
      res.json({
        job_id: job.id,
        status: job.status,
        error: job.error
      });
    } else {
      res.json({
        job_id: job.id,
        status: job.status,
        format: job.format
      });
    }
  } catch (error: any) {
    console.error('Get export status error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get export status' }
    });
  }
});

/**
 * GET /api/v1/dsr/export/:job_id/download
 * Download exported data
 */
router.get('/export/:job_id/download', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const jobId = req.params.job_id;

    const job = await exportService.getExportJob(jobId, userId);

    if (!job) {
      return res.status(404).json({
        error: { code: 'JOB_NOT_FOUND', message: 'Export job not found' }
      });
    }

    if (job.status !== 'completed' || !job.file_path) {
      return res.status(400).json({
        error: { code: 'JOB_NOT_COMPLETE', message: 'Export job not completed' }
      });
    }

    // Read file from exports directory
    const filePath = path.join(process.env.FILE_STORAGE_PATH || './storage/files', job.file_path);
    const fileData = await fs.promises.readFile(filePath);

    const contentType = job.format === 'zip' 
      ? 'application/zip' 
      : job.format === 'json' 
        ? 'application/json' 
        : 'text/csv';

    const extension = job.format === 'zip' ? 'zip' : job.format === 'json' ? 'json' : 'csv';
    const filename = `data_export_${jobId}.${extension}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(fileData);
  } catch (error: any) {
    console.error('Download export error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to download export' }
    });
  }
});

/**
 * POST /api/v1/dsr/delete-account
 * Delete user account with crypto-erasure
 */
router.post('/delete-account', authenticate, sensitiveOperationLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { password, confirmation } = req.body;

    if (!password) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Password required' }
      });
    }

    if (confirmation !== 'DELETE') {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Confirmation must be "DELETE"' }
      });
    }

    await deletionService.deleteAccount(userId, password);

    res.status(202).json({
      status: 'deletion_initiated',
      completion_time: new Date().toISOString(),
      message: 'Account deletion initiated. Data will be permanently deleted after retention period.'
    });
  } catch (error: any) {
    if (error.message === 'Invalid password') {
      return res.status(401).json({
        error: { code: 'INVALID_PASSWORD', message: 'Invalid password' }
      });
    }
    console.error('Delete account error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete account' }
    });
  }
});

/**
 * POST /api/v1/dsr/withdraw-consent/:consent_id
 * Withdraw consent (delegated to sharing module)
 */
router.post('/withdraw-consent/:consent_id', authenticate, async (req: Request, res: Response) => {
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
 * GET /api/v1/dsr/retention
 * Get retention summary
 */
router.get('/retention', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const summary = await retentionService.getRetentionSummary(userId);

    res.json(summary);
  } catch (error: any) {
    console.error('Get retention summary error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get retention summary' }
    });
  }
});

/**
 * PUT /api/v1/dsr/retention/records/:record_id
 * Set retention policy for a record
 */
router.put('/retention/records/:record_id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const recordId = req.params.record_id;
    const { retain_until, retain_for_days, auto_delete } = req.body;

    const policy: any = {};
    if (retain_until) {
      policy.retain_until = new Date(retain_until);
    }
    if (retain_for_days) {
      const until = new Date();
      until.setDate(until.getDate() + parseInt(retain_for_days));
      policy.retain_until = until;
    }
    if (auto_delete !== undefined) {
      policy.auto_delete = auto_delete;
    }

    await retentionService.applyRetentionPolicy(recordId, userId, policy);

    res.json({
      record_id: recordId,
      retention_policy: policy
    });
  } catch (error: any) {
    console.error('Set retention policy error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to set retention policy' }
    });
  }
});

/**
 * PUT /api/v1/dsr/retention/files/:file_id
 * Set retention policy for a file
 */
router.put('/retention/files/:file_id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const fileId = req.params.file_id;
    const { retain_until, retain_for_days, auto_delete } = req.body;

    const policy: any = {};
    if (retain_until) {
      policy.retain_until = new Date(retain_until);
    }
    if (retain_for_days) {
      const until = new Date();
      until.setDate(until.getDate() + parseInt(retain_for_days));
      policy.retain_until = until;
    }
    if (auto_delete !== undefined) {
      policy.auto_delete = auto_delete;
    }

    await retentionService.applyRetentionPolicyToFile(fileId, userId, policy);

    res.json({
      file_id: fileId,
      retention_policy: policy
    });
  } catch (error: any) {
    console.error('Set retention policy error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to set retention policy' }
    });
  }
});

export default router;

