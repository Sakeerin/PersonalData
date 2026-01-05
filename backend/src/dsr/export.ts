/**
 * Data export functionality for DSR (Data Subject Rights)
 */

import { v4 as uuidv4 } from 'uuid';
import { query } from '../utils/db';
import * as recordsService from '../vault/records';
import * as filesService from '../vault/files';
import { getFileStorage } from '../storage/fileStorage';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export interface ExportJob {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: 'zip' | 'json' | 'csv';
  file_path?: string;
  error?: string;
  created_at: Date;
  completed_at?: Date;
}

/**
 * Create export job
 */
export async function createExportJob(userId: string, format: 'zip' | 'json' | 'csv' = 'zip'): Promise<string> {
  const jobId = uuidv4();

  await query(
    `INSERT INTO export_jobs (id, user_id, status, format, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [jobId, userId, 'pending', format]
  );

  return jobId;
}

/**
 * Get export job
 */
export async function getExportJob(jobId: string, userId: string): Promise<ExportJob | null> {
  const result = await query(
    'SELECT * FROM export_jobs WHERE id = $1 AND user_id = $2',
    [jobId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    status: row.status,
    format: row.format,
    file_path: row.file_path,
    error: row.error,
    created_at: row.created_at,
    completed_at: row.completed_at
  };
}

/**
 * Update export job status
 */
async function updateExportJob(
  jobId: string,
  status: ExportJob['status'],
  filePath?: string,
  error?: string
): Promise<void> {
  await query(
    `UPDATE export_jobs 
     SET status = $1, file_path = $2, error = $3, completed_at = $4
     WHERE id = $5`,
    [status, filePath || null, error || null, status === 'completed' || status === 'failed' ? new Date() : null, jobId]
  );
}

/**
 * Export user data as JSON
 */
export async function exportDataAsJSON(userId: string): Promise<any> {
  // Get all records
  const recordsResult = await recordsService.listRecords({
    userId,
    limit: 10000 // Large limit for export
  });

  // Get all files metadata
  const filesResult = await filesService.listFiles({
    userId,
    limit: 10000
  });

  return {
    export_date: new Date().toISOString(),
    user_id: userId,
    records: recordsResult.records.map(record => ({
      id: record.id,
      type: record.type,
      encrypted_data: record.encrypted_data.toString('base64'),
      encrypted_metadata: record.encrypted_metadata,
      tags: record.tags,
      labels: record.labels,
      retention_policy: record.retention_policy,
      created_at: record.created_at,
      updated_at: record.updated_at
    })),
    files: filesResult.files.map(file => ({
      id: file.id,
      encrypted_metadata: file.encrypted_metadata,
      mime_type: file.mime_type,
      size: file.size,
      checksum: file.checksum,
      retention_policy: file.retention_policy,
      created_at: file.created_at,
      updated_at: file.updated_at
    })),
    metadata: {
      total_records: recordsResult.records.length,
      total_files: filesResult.files.length,
      export_format: 'json'
    }
  };
}

/**
 * Export user data as CSV (records only, simplified)
 */
export async function exportDataAsCSV(userId: string): Promise<string> {
  const recordsResult = await recordsService.listRecords({
    userId,
    limit: 10000
  });

  const headers = ['id', 'type', 'tags', 'created_at', 'updated_at'];
  const rows = recordsResult.records.map(record => [
    record.id,
    record.type,
    record.tags.join(';'),
    record.created_at.toISOString(),
    record.updated_at.toISOString()
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
}

/**
 * Export user data as ZIP (JSON + files)
 */
export async function exportDataAsZIP(userId: string, jobId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const outputPath = path.join(process.env.FILE_STORAGE_PATH || './storage/files', 'exports', `${jobId}.zip`);
    const outputDir = path.dirname(outputPath);
    
    // Ensure exports directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const output = fs.createWriteStream(outputPath);
    archive.pipe(output);

    output.on('close', async () => {
      resolve(`exports/${jobId}.zip`);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    // Get JSON data and add to archive
    exportDataAsJSON(userId).then(jsonData => {
      archive.append(JSON.stringify(jsonData, null, 2), { name: 'data.json' });

      // Get files and add to archive
      return filesService.listFiles({
        userId,
        limit: 10000
      });
    }).then(filesResult => {
      // Add files to archive
      const filePromises = filesResult.files.map(async (file) => {
        try {
          const fileData = await filesService.getFileData(file.id, userId);
          archive.append(fileData, { name: `files/${file.id}` });
        } catch (error) {
          console.error(`Error adding file ${file.id} to archive:`, error);
        }
      });

      return Promise.all(filePromises);
    }).then(() => {
      archive.finalize();
    }).catch(reject);
  });
}

/**
 * Process export job
 */
export async function processExportJob(jobId: string, userId: string): Promise<void> {
  try {
    await updateExportJob(jobId, 'processing');

    const job = await getExportJob(jobId, userId);
    if (!job) {
      throw new Error('Export job not found');
    }

    let filePath: string;

    switch (job.format) {
      case 'json':
        const jsonData = await exportDataAsJSON(userId);
        const jsonBuffer = Buffer.from(JSON.stringify(jsonData, null, 2));
        filePath = `exports/${jobId}.json`;
        await getFileStorage().storeFile(jsonBuffer, filePath);
        break;

      case 'csv':
        const csvData = await exportDataAsCSV(userId);
        const csvBuffer = Buffer.from(csvData);
        filePath = `exports/${jobId}.csv`;
        await getFileStorage().storeFile(csvBuffer, filePath);
        break;

      case 'zip':
        filePath = await exportDataAsZIP(userId, jobId);
        break;

      default:
        throw new Error(`Unsupported format: ${job.format}`);
    }

    await updateExportJob(jobId, 'completed', filePath);
  } catch (error: any) {
    console.error(`Export job ${jobId} failed:`, error);
    await updateExportJob(jobId, 'failed', undefined, error.message);
    throw error;
  }
}

