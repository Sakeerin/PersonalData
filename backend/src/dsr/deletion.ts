/**
 * Account deletion with crypto-erasure
 */

import { query, transaction } from '../utils/db';
import * as recordsService from '../vault/records';
import * as filesService from '../vault/files';
import * as sharingService from '../access/sharing';
import * as consentService from '../access/consent';
import { AuditEventType } from '../audit/events';
import * as auditLogger from '../audit/logger';
import { getFileStorage } from '../storage/fileStorage';

/**
 * Delete user account with crypto-erasure
 * This performs immediate key destruction and schedules data deletion
 */
export async function deleteAccount(userId: string, password: string): Promise<boolean> {
  // Verify password before deletion
  const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const { verifyPassword } = await import('../auth/auth');
  const isValid = await verifyPassword(password, userResult.rows[0].password_hash);
  if (!isValid) {
    throw new Error('Invalid password');
  }

  return await transaction(async (client) => {
    // 1. Mark keys for deletion (crypto-erasure)
    // Delete user keys - this makes data unreadable immediately
    await client.query('DELETE FROM user_keys WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM data_keys WHERE key_id IN (SELECT id FROM user_keys WHERE user_id = $1)', [userId]);

    // 2. Revoke all sessions
    await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

    // 3. Revoke all devices
    await client.query('DELETE FROM devices WHERE user_id = $1', [userId]);

    // 4. Revoke all shares
    await client.query('DELETE FROM shares WHERE owner_id = $1', [userId]);

    // 5. Withdraw all consents
    await client.query(
      `UPDATE consents 
       SET withdrawn_at = NOW()
       WHERE user_id = $1 AND withdrawn_at IS NULL`,
      [userId]
    );

    // 6. Mark records and files as deleted (soft delete with immediate effect)
    await client.query(
      `UPDATE records 
       SET deleted_at = NOW()
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    await client.query(
      `UPDATE files 
       SET deleted_at = NOW()
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    // 7. Mark user account as deleted (tombstone)
    await client.query(
      `UPDATE users 
       SET email = $1, password_hash = '', mfa_secret = NULL, recovery_codes_hash = NULL
       WHERE id = $2`,
      [`deleted_${userId}_${Date.now()}`, userId]
    );

    // 8. Log deletion
    await auditLogger.logSecurityEvent(
      AuditEventType.ACCOUNT_DELETED,
      userId,
      { account_deleted: true, crypto_erasure: true }
    );

    return true;
  });
}

/**
 * Permanently delete user data (after retention period)
 * This should be run by a background job after retention period
 */
export async function permanentlyDeleteUserData(userId: string): Promise<void> {
  await transaction(async (client) => {
    // Get all records and files marked for deletion
    const recordsResult = await client.query(
      'SELECT id FROM records WHERE user_id = $1 AND deleted_at IS NOT NULL',
      [userId]
    );

    const filesResult = await client.query(
      'SELECT id, encrypted_file_path FROM files WHERE user_id = $1 AND deleted_at IS NOT NULL',
      [userId]
    );

    // Delete data keys
    const recordIds = recordsResult.rows.map(r => r.id);
    const fileIds = filesResult.rows.map(f => f.id);

    if (recordIds.length > 0) {
      await client.query('DELETE FROM data_keys WHERE record_id = ANY($1)', [recordIds]);
    }
    if (fileIds.length > 0) {
      await client.query('DELETE FROM data_keys WHERE file_id = ANY($1)', [fileIds]);
    }

    // Delete records
    await client.query('DELETE FROM records WHERE user_id = $1', [userId]);

    // Delete files from storage and database
    const storage = getFileStorage();
    for (const file of filesResult.rows) {
      try {
        await storage.deleteFile(file.encrypted_file_path);
      } catch (error) {
        console.error(`Error deleting file ${file.id}:`, error);
      }
    }
    await client.query('DELETE FROM files WHERE user_id = $1', [userId]);

    // Delete audit logs (tombstone - keep structure but remove user_id)
    await client.query(
      `UPDATE audit_logs 
       SET user_id = NULL, metadata = jsonb_set(metadata, '{user_deleted}', 'true'::jsonb)
       WHERE user_id = $1`,
      [userId]
    );

    // Delete alerts
    await client.query('DELETE FROM alerts WHERE user_id = $1', [userId]);

    // Finally delete user record
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
  });
}

/**
 * Check if user account is deleted
 */
export async function isAccountDeleted(userId: string): Promise<boolean> {
  const result = await query(
    "SELECT email FROM users WHERE id = $1 AND email LIKE 'deleted_%'",
    [userId]
  );
  return result.rows.length > 0;
}

