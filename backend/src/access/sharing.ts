import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { checkPermission, Permission, AccessRequest } from './permissions';

export type ShareType = 'delegate' | 'app' | 'link';
export type ResourceType = 'record' | 'file' | 'collection';

export interface ShareRow {
  id: string;
  owner_id: string;
  resource_type: ResourceType;
  resource_id: string;
  share_type: ShareType;
  token: string;
  expires_at: Date | null;
  purpose: string | null;
  created_at: Date;
}

export interface CreateShareData {
  owner_id: string;
  resource_type: ResourceType;
  resource_id: string;
  share_type: ShareType;
  expires_at?: Date;
  purpose?: string;
  permissions: Permission[];
}

export interface PermissionRow {
  id: string;
  share_id: string;
  action: string;
  conditions: any; // JSONB
}

/**
 * Generate share token
 */
function generateShareToken(): string {
  const randomBytes = crypto.randomBytes(16);
  return uuidv4() + '-' + randomBytes.toString('base64url');
}

/**
 * Create a share
 */
export async function createShare(data: CreateShareData): Promise<{ shareId: string; token: string }> {
  const shareId = uuidv4();
  const token = generateShareToken();

  await transaction(async (client) => {
    // Create share record
    await client.query(
      `INSERT INTO shares (id, owner_id, resource_type, resource_id, share_type, token, expires_at, purpose)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        shareId,
        data.owner_id,
        data.resource_type,
        data.resource_id,
        data.share_type,
        token,
        data.expires_at || null,
        data.purpose || null
      ]
    );

    // Create permissions
    for (const permission of data.permissions) {
      const permissionId = uuidv4();
      await client.query(
        `INSERT INTO permissions (id, share_id, action, conditions)
         VALUES ($1, $2, $3, $4)`,
        [
          permissionId,
          shareId,
          permission.action,
          JSON.stringify(permission.conditions || {})
        ]
      );
    }
  });

  return { shareId, token };
}

/**
 * Get share by token
 */
export async function getShareByToken(token: string): Promise<ShareRow | null> {
  const result = await query(
    'SELECT * FROM shares WHERE token = $1',
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  // Check expiry
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return null; // Expired
  }

  return {
    id: row.id,
    owner_id: row.owner_id,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    share_type: row.share_type,
    token: row.token,
    expires_at: row.expires_at,
    purpose: row.purpose,
    created_at: row.created_at
  };
}

/**
 * Get permissions for a share
 */
export async function getSharePermissions(shareId: string): Promise<Permission[]> {
  const result = await query(
    'SELECT * FROM permissions WHERE share_id = $1',
    [shareId]
  );

  return result.rows.map((row: PermissionRow) => ({
    action: row.action as any,
    conditions: row.conditions
  }));
}

/**
 * Check if share allows access
 */
export async function checkShareAccess(
  token: string,
  request: AccessRequest
): Promise<{ allowed: boolean; permissions?: Permission[]; reason?: string }> {
  const share = await getShareByToken(token);

  if (!share) {
    return { allowed: false, reason: 'Share not found or expired' };
  }

  // Verify resource matches
  if (share.resource_type !== request.resourceType || share.resource_id !== request.resourceId) {
    return { allowed: false, reason: 'Resource mismatch' };
  }

  // Get permissions
  const permissions = await getSharePermissions(share.id);

  // Check if any permission allows the action
  for (const permission of permissions) {
    const check = checkPermission(permission, request);
    if (check.allowed) {
      // Mark one-time access as used
      if (permission.conditions?.oneTime && !permission.conditions.used) {
        await query(
          'UPDATE permissions SET conditions = jsonb_set(conditions, \'{used}\', \'true\'::jsonb) WHERE share_id = $1 AND action = $2',
          [share.id, permission.action]
        );
      }
      return { allowed: true, permissions };
    }
  }

  return { allowed: false, reason: 'Action not permitted by share' };
}

/**
 * List shares for a user
 */
export async function listShares(
  userId: string,
  resourceType?: ResourceType,
  resourceId?: string
): Promise<ShareRow[]> {
  let queryText = 'SELECT * FROM shares WHERE owner_id = $1';
  const params: any[] = [userId];
  let paramIndex = 2;

  if (resourceType) {
    queryText += ` AND resource_type = $${paramIndex++}`;
    params.push(resourceType);
  }

  if (resourceId) {
    queryText += ` AND resource_id = $${paramIndex++}`;
    params.push(resourceId);
  }

  queryText += ' ORDER BY created_at DESC';

  const result = await query(queryText, params);

  return result.rows.map(row => ({
    id: row.id,
    owner_id: row.owner_id,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    share_type: row.share_type,
    token: row.token,
    expires_at: row.expires_at,
    purpose: row.purpose,
    created_at: row.created_at
  }));
}

/**
 * Revoke a share
 */
export async function revokeShare(shareId: string, ownerId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM shares WHERE id = $1 AND owner_id = $2',
    [shareId, ownerId]
  );

  // Permissions are automatically deleted via CASCADE
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Revoke all shares for a resource
 */
export async function revokeAllSharesForResource(
  resourceType: ResourceType,
  resourceId: string,
  ownerId: string
): Promise<number> {
  const result = await query(
    'DELETE FROM shares WHERE resource_type = $1 AND resource_id = $2 AND owner_id = $3',
    [resourceType, resourceId, ownerId]
  );

  return result.rowCount || 0;
}

/**
 * Clean up expired shares (should be run periodically)
 */
export async function cleanupExpiredShares(): Promise<number> {
  const result = await query(
    'DELETE FROM shares WHERE expires_at IS NOT NULL AND expires_at < NOW()',
    []
  );

  return result.rowCount || 0;
}

