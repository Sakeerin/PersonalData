import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { FileRow, CreateFileData, UpdateFileData } from '../models/File';
import { getFileStorage } from '../storage/fileStorage';

/**
 * Create a new file record
 */
export async function createFile(data: CreateFileData, fileData: Buffer): Promise<string> {
  const fileId = uuidv4();

  await transaction(async (client) => {
    // Store file on filesystem
    const storage = getFileStorage();
    const storedFileId = await storage.storeFile(fileData, fileId);

    // Create database record
    await client.query(
      `INSERT INTO files (id, user_id, encrypted_file_path, encrypted_metadata, mime_type, size, checksum, retention_policy)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        fileId,
        data.user_id,
        storedFileId, // Store file ID as path reference
        JSON.stringify(data.encrypted_metadata || {}),
        data.mime_type,
        data.size,
        data.checksum,
        data.retention_policy ? JSON.stringify(data.retention_policy) : null
      ]
    );
  });

  return fileId;
}

/**
 * Get a file by ID
 */
export async function getFile(fileId: string, userId: string): Promise<FileRow | null> {
  const result = await query(
    `SELECT * FROM files 
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [fileId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    encrypted_file_path: row.encrypted_file_path,
    encrypted_metadata: row.encrypted_metadata,
    mime_type: row.mime_type,
    size: row.size,
    checksum: row.checksum,
    retention_policy: row.retention_policy,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at
  };
}

/**
 * Get file data (encrypted)
 */
export async function getFileData(fileId: string, userId: string): Promise<Buffer> {
  const file = await getFile(fileId, userId);
  
  if (!file) {
    throw new Error('File not found');
  }

  const storage = getFileStorage();
  return await storage.getFile(file.encrypted_file_path);
}

/**
 * List files with pagination and filters
 */
export interface ListFilesOptions {
  userId: string;
  page?: number;
  limit?: number;
  mimeType?: string;
  search?: string;
}

export interface ListFilesResult {
  files: FileRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export async function listFiles(options: ListFilesOptions): Promise<ListFilesResult> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 50, 100);
  const offset = (page - 1) * limit;

  let whereConditions = ['user_id = $1', 'deleted_at IS NULL'];
  const queryParams: any[] = [options.userId];
  let paramIndex = 2;

  if (options.mimeType) {
    whereConditions.push(`mime_type = $${paramIndex}`);
    queryParams.push(options.mimeType);
    paramIndex++;
  }

  if (options.search) {
    whereConditions.push(`encrypted_metadata::text ILIKE $${paramIndex}`);
    queryParams.push(`%${options.search}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.join(' AND ');

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) FROM files WHERE ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].count, 10);
  const total_pages = Math.ceil(total / limit);

  // Get files
  const filesResult = await query(
    `SELECT * FROM files 
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  const files = filesResult.rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    encrypted_file_path: row.encrypted_file_path,
    encrypted_metadata: row.encrypted_metadata,
    mime_type: row.mime_type,
    size: row.size,
    checksum: row.checksum,
    retention_policy: row.retention_policy,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at
  }));

  return {
    files,
    pagination: {
      page,
      limit,
      total,
      total_pages
    }
  };
}

/**
 * Update file metadata
 */
export async function updateFile(
  fileId: string,
  userId: string,
  data: UpdateFileData
): Promise<boolean> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.encrypted_metadata !== undefined) {
    updates.push(`encrypted_metadata = $${paramIndex++}`);
    values.push(JSON.stringify(data.encrypted_metadata));
  }

  if (data.retention_policy !== undefined) {
    updates.push(`retention_policy = $${paramIndex++}`);
    values.push(data.retention_policy ? JSON.stringify(data.retention_policy) : null);
  }

  if (updates.length === 0) {
    return false;
  }

  updates.push(`updated_at = NOW()`);
  values.push(fileId, userId);

  const result = await query(
    `UPDATE files 
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex} AND deleted_at IS NULL`,
    values
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Delete a file (soft delete)
 */
export async function deleteFile(fileId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE files 
     SET deleted_at = NOW()
     WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [fileId, userId]
  );

  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Permanently delete a file (hard delete)
 */
export async function permanentlyDeleteFile(fileId: string, userId: string): Promise<boolean> {
  return await transaction(async (client) => {
    // Get file path
    const fileResult = await client.query(
      'SELECT encrypted_file_path FROM files WHERE id = $1 AND user_id = $2',
      [fileId, userId]
    );

    if (fileResult.rows.length === 0) {
      return false;
    }

    const filePath = fileResult.rows[0].encrypted_file_path;

    // Delete from database
    await client.query('DELETE FROM files WHERE id = $1 AND user_id = $2', [fileId, userId]);

    // Delete from storage
    try {
      const storage = getFileStorage();
      await storage.deleteFile(filePath);
    } catch (error) {
      // Log error but don't fail if file already deleted
      console.error(`Error deleting file from storage: ${filePath}`, error);
    }

    return true;
  });
}

