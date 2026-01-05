/**
 * Data retention controls
 */

import { query } from '../utils/db';
import * as recordsService from '../vault/records';
import * as filesService from '../vault/files';
import { getFileStorage } from '../storage/fileStorage';

export interface RetentionPolicy {
  retain_until?: Date;
  retain_for_days?: number;
  auto_delete?: boolean;
}

/**
 * Apply retention policy to a record
 */
export async function applyRetentionPolicy(
  recordId: string,
  userId: string,
  policy: RetentionPolicy
): Promise<void> {
  await recordsService.updateRecord(recordId, userId, {
    retention_policy: policy
  });
}

/**
 * Apply retention policy to a file
 */
export async function applyRetentionPolicyToFile(
  fileId: string,
  userId: string,
  policy: RetentionPolicy
): Promise<void> {
  await filesService.updateFile(fileId, userId, {
    retention_policy: policy
  });
}

/**
 * Cleanup expired records (should be run periodically)
 */
export async function cleanupExpiredRecords(): Promise<number> {
  const result = await query(
    `SELECT id, user_id FROM records 
     WHERE deleted_at IS NULL 
     AND retention_policy IS NOT NULL
     AND retention_policy->>'retain_until' IS NOT NULL
     AND (retention_policy->>'retain_until')::timestamp < NOW()`,
    []
  );

  let deletedCount = 0;

  for (const row of result.rows) {
    try {
      await recordsService.deleteRecord(row.id, row.user_id);
      deletedCount++;
    } catch (error) {
      console.error(`Error deleting expired record ${row.id}:`, error);
    }
  }

  return deletedCount;
}

/**
 * Cleanup expired files (should be run periodically)
 */
export async function cleanupExpiredFiles(): Promise<number> {
  const result = await query(
    `SELECT id, user_id, encrypted_file_path FROM files 
     WHERE deleted_at IS NULL 
     AND retention_policy IS NOT NULL
     AND retention_policy->>'retain_until' IS NOT NULL
     AND (retention_policy->>'retain_until')::timestamp < NOW()`,
    []
  );

  let deletedCount = 0;
  const storage = getFileStorage();

  for (const row of result.rows) {
    try {
      await filesService.deleteFile(row.id, row.user_id);
      // Also delete from storage
      try {
        await storage.deleteFile(row.encrypted_file_path);
      } catch (error) {
        console.error(`Error deleting file from storage ${row.id}:`, error);
      }
      deletedCount++;
    } catch (error) {
      console.error(`Error deleting expired file ${row.id}:`, error);
    }
  }

  return deletedCount;
}

/**
 * Get retention summary for user
 */
export async function getRetentionSummary(userId: string): Promise<{
  records: { total: number; with_policy: number; expiring_soon: number };
  files: { total: number; with_policy: number; expiring_soon: number };
}> {
  // Count records
  const recordsTotal = await query(
    'SELECT COUNT(*) FROM records WHERE user_id = $1 AND deleted_at IS NULL',
    [userId]
  );

  const recordsWithPolicy = await query(
    `SELECT COUNT(*) FROM records 
     WHERE user_id = $1 
     AND deleted_at IS NULL 
     AND retention_policy IS NOT NULL`,
    [userId]
  );

  const recordsExpiringSoon = await query(
    `SELECT COUNT(*) FROM records 
     WHERE user_id = $1 
     AND deleted_at IS NULL 
     AND retention_policy IS NOT NULL
     AND retention_policy->>'retain_until' IS NOT NULL
     AND (retention_policy->>'retain_until')::timestamp BETWEEN NOW() AND NOW() + INTERVAL '7 days'`,
    [userId]
  );

  // Count files
  const filesTotal = await query(
    'SELECT COUNT(*) FROM files WHERE user_id = $1 AND deleted_at IS NULL',
    [userId]
  );

  const filesWithPolicy = await query(
    `SELECT COUNT(*) FROM files 
     WHERE user_id = $1 
     AND deleted_at IS NULL 
     AND retention_policy IS NOT NULL`,
    [userId]
  );

  const filesExpiringSoon = await query(
    `SELECT COUNT(*) FROM files 
     WHERE user_id = $1 
     AND deleted_at IS NULL 
     AND retention_policy IS NOT NULL
     AND retention_policy->>'retain_until' IS NOT NULL
     AND (retention_policy->>'retain_until')::timestamp BETWEEN NOW() AND NOW() + INTERVAL '7 days'`,
    [userId]
  );

  return {
    records: {
      total: parseInt(recordsTotal.rows[0].count, 10),
      with_policy: parseInt(recordsWithPolicy.rows[0].count, 10),
      expiring_soon: parseInt(recordsExpiringSoon.rows[0].count, 10)
    },
    files: {
      total: parseInt(filesTotal.rows[0].count, 10),
      with_policy: parseInt(filesWithPolicy.rows[0].count, 10),
      expiring_soon: parseInt(filesExpiringSoon.rows[0].count, 10)
    }
  };
}

