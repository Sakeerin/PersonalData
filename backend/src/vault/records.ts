import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { RecordRow, CreateRecordData, UpdateRecordData } from '../models/Record';

/**
 * Create a new record
 */
export async function createRecord(data: CreateRecordData): Promise<string> {
  const recordId = uuidv4();
  
  await query(
    `INSERT INTO records (id, user_id, type, encrypted_data, encrypted_metadata, tags, labels, retention_policy)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      recordId,
      data.user_id,
      data.type,
      data.encrypted_data,
      JSON.stringify(data.encrypted_metadata || {}),
      data.tags || [],
      data.labels || [],
      data.retention_policy ? JSON.stringify(data.retention_policy) : null
    ]
  );

  return recordId;
}

/**
 * Get a record by ID
 */
export async function getRecord(recordId: string, userId: string): Promise<RecordRow | null> {
  const result = await query(
    `SELECT * FROM records 
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [recordId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    encrypted_data: row.encrypted_data,
    encrypted_metadata: row.encrypted_metadata,
    tags: row.tags || [],
    labels: row.labels || [],
    retention_policy: row.retention_policy,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at
  };
}

/**
 * List records with pagination and filters
 */
export interface ListRecordsOptions {
  userId: string;
  page?: number;
  limit?: number;
  type?: string;
  tags?: string[];
  search?: string;
}

export interface ListRecordsResult {
  records: RecordRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export async function listRecords(options: ListRecordsOptions): Promise<ListRecordsResult> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 50, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  let whereConditions = ['user_id = $1', 'deleted_at IS NULL'];
  const queryParams: any[] = [options.userId];
  let paramIndex = 2;

  if (options.type) {
    whereConditions.push(`type = $${paramIndex}`);
    queryParams.push(options.type);
    paramIndex++;
  }

  if (options.tags && options.tags.length > 0) {
    whereConditions.push(`tags && $${paramIndex}`);
    queryParams.push(options.tags);
    paramIndex++;
  }

  if (options.search) {
    // Search in tags (unencrypted) and metadata (encrypted, but we can search structure)
    whereConditions.push(`(tags::text ILIKE $${paramIndex} OR encrypted_metadata::text ILIKE $${paramIndex})`);
    queryParams.push(`%${options.search}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.join(' AND ');

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) FROM records WHERE ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].count, 10);
  const total_pages = Math.ceil(total / limit);

  // Get records
  const recordsResult = await query(
    `SELECT * FROM records 
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  const records = recordsResult.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    encrypted_data: row.encrypted_data,
    encrypted_metadata: row.encrypted_metadata,
    tags: row.tags || [],
    labels: row.labels || [],
    retention_policy: row.retention_policy,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at
  }));

  return {
    records,
    pagination: {
      page,
      limit,
      total,
      total_pages
    }
  };
}

/**
 * Update a record
 */
export async function updateRecord(
  recordId: string,
  userId: string,
  data: UpdateRecordData
): Promise<boolean> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.type !== undefined) {
    updates.push(`type = $${paramIndex++}`);
    values.push(data.type);
  }

  if (data.encrypted_data !== undefined) {
    updates.push(`encrypted_data = $${paramIndex++}`);
    values.push(data.encrypted_data);
  }

  if (data.encrypted_metadata !== undefined) {
    updates.push(`encrypted_metadata = $${paramIndex++}`);
    values.push(JSON.stringify(data.encrypted_metadata));
  }

  if (data.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    values.push(data.tags);
  }

  if (data.labels !== undefined) {
    updates.push(`labels = $${paramIndex++}`);
    values.push(data.labels);
  }

  if (data.retention_policy !== undefined) {
    updates.push(`retention_policy = $${paramIndex++}`);
    values.push(data.retention_policy ? JSON.stringify(data.retention_policy) : null);
  }

  if (updates.length === 0) {
    return false;
  }

  updates.push(`updated_at = NOW()`);
  values.push(recordId, userId);

  const result = await query(
    `UPDATE records 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex} AND deleted_at IS NULL`,
    values
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Delete a record (soft delete)
 */
export async function deleteRecord(recordId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE records 
     SET deleted_at = NOW()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [recordId, userId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Permanently delete a record (hard delete)
 */
export async function permanentlyDeleteRecord(recordId: string, userId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM records 
     WHERE id = $1 AND user_id = $2`,
    [recordId, userId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

