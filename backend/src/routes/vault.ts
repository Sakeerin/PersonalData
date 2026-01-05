import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { apiLimiter, sensitiveOperationLimiter } from '../middleware/rateLimit';
import * as recordsService from '../vault/records';
import * as filesService from '../vault/files';
import * as templatesService from '../vault/templates';
import { getFileStorage } from '../storage/fileStorage';
import { serializeEncrypted, deserializeEncrypted } from '../crypto/encryption';

const router = Router();

// Configure multer for file uploads (memory storage for encrypted files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

/**
 * GET /api/v1/vault/records
 * List records
 */
router.get('/records', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const type = req.query.type as string;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
    const search = req.query.search as string;

    const result = await recordsService.listRecords({
      userId,
      page,
      limit,
      type,
      tags,
      search
    });

    // Convert encrypted_data Buffer to base64 for JSON response
    const records = result.records.map(record => ({
      id: record.id,
      type: record.type,
      encrypted_data: record.encrypted_data.toString('base64'),
      encrypted_metadata: record.encrypted_metadata,
      tags: record.tags,
      labels: record.labels,
      retention_policy: record.retention_policy,
      created_at: record.created_at,
      updated_at: record.updated_at
    }));

    res.json({
      records,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error('List records error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list records' }
    });
  }
});

/**
 * POST /api/v1/vault/records
 * Create a new record
 */
router.post('/records', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      type,
      encrypted_data,
      encrypted_metadata,
      tags,
      labels,
      retention_policy,
      dek_wrapped
    } = req.body;

    if (!type || !encrypted_data) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Missing required fields: type, encrypted_data' }
      });
    }

    // Convert base64 encrypted_data to Buffer
    const encryptedDataBuffer = Buffer.from(encrypted_data, 'base64');

    const recordId = await recordsService.createRecord({
      user_id: userId,
      type,
      encrypted_data: encryptedDataBuffer,
      encrypted_metadata: encrypted_metadata || {},
      tags: tags || [],
      labels: labels || [],
      retention_policy: retention_policy || null
    });

    // Store wrapped DEK if provided
    if (dek_wrapped) {
      // In production, store DEK in data_keys table
      // For MVP, we'll skip this for now (client manages keys)
    }

    res.status(201).json({
      id: recordId,
      created_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Create record error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create record' }
    });
  }
});

/**
 * GET /api/v1/vault/records/:id
 * Get a specific record
 */
router.get('/records/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const recordId = req.params.id;

    const record = await recordsService.getRecord(recordId, userId);

    if (!record) {
      return res.status(404).json({
        error: { code: 'RECORD_NOT_FOUND', message: 'Record not found' }
      });
    }

    res.json({
      id: record.id,
      type: record.type,
      encrypted_data: record.encrypted_data.toString('base64'),
      encrypted_metadata: record.encrypted_metadata,
      tags: record.tags,
      labels: record.labels,
      retention_policy: record.retention_policy,
      created_at: record.created_at,
      updated_at: record.updated_at
    });
  } catch (error: any) {
    console.error('Get record error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get record' }
    });
  }
});

/**
 * PUT /api/v1/vault/records/:id
 * Update a record
 */
router.put('/records/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const recordId = req.params.id;
    const {
      type,
      encrypted_data,
      encrypted_metadata,
      tags,
      labels,
      retention_policy
    } = req.body;

    const updateData: any = {};

    if (type !== undefined) updateData.type = type;
    if (encrypted_data !== undefined) {
      updateData.encrypted_data = Buffer.from(encrypted_data, 'base64');
    }
    if (encrypted_metadata !== undefined) updateData.encrypted_metadata = encrypted_metadata;
    if (tags !== undefined) updateData.tags = tags;
    if (labels !== undefined) updateData.labels = labels;
    if (retention_policy !== undefined) updateData.retention_policy = retention_policy;

    const updated = await recordsService.updateRecord(recordId, userId, updateData);

    if (!updated) {
      return res.status(404).json({
        error: { code: 'RECORD_NOT_FOUND', message: 'Record not found' }
      });
    }

    res.json({
      id: recordId,
      updated_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Update record error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update record' }
    });
  }
});

/**
 * DELETE /api/v1/vault/records/:id
 * Delete a record
 */
router.delete('/records/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const recordId = req.params.id;

    const deleted = await recordsService.deleteRecord(recordId, userId);

    if (!deleted) {
      return res.status(404).json({
        error: { code: 'RECORD_NOT_FOUND', message: 'Record not found' }
      });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete record error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete record' }
    });
  }
});

/**
 * GET /api/v1/vault/files
 * List files
 */
router.get('/files', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const mimeType = req.query.mime_type as string;
    const search = req.query.search as string;

    const result = await filesService.listFiles({
      userId,
      page,
      limit,
      mimeType,
      search
    });

    res.json({
      files: result.files.map(file => ({
        id: file.id,
        encrypted_metadata: file.encrypted_metadata,
        mime_type: file.mime_type,
        size: file.size,
        checksum: file.checksum,
        retention_policy: file.retention_policy,
        created_at: file.created_at,
        updated_at: file.updated_at
      })),
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error('List files error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list files' }
    });
  }
});

/**
 * POST /api/v1/vault/files
 * Upload a file
 */
router.post('/files', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'No file provided' }
      });
    }

    const {
      encrypted_metadata,
      mime_type,
      checksum,
      retention_policy,
      dek_wrapped
    } = req.body;

    // Calculate checksum if not provided
    const storage = getFileStorage();
    const fileChecksum = checksum || await storage.calculateChecksum(file.buffer);

    const fileId = await filesService.createFile(
      {
        user_id: userId,
        encrypted_file_path: '', // Will be set by service
        encrypted_metadata: encrypted_metadata ? JSON.parse(encrypted_metadata) : {},
        mime_type: mime_type || file.mimetype || 'application/octet-stream',
        size: file.size,
        checksum: fileChecksum,
        retention_policy: retention_policy ? JSON.parse(retention_policy) : null
      },
      file.buffer
    );

    res.status(201).json({
      id: fileId,
      size: file.size,
      created_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Upload file error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to upload file' }
    });
  }
});

/**
 * GET /api/v1/vault/files/:id
 * Download a file
 */
router.get('/files/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const fileId = req.params.id;

    const file = await filesService.getFile(fileId, userId);

    if (!file) {
      return res.status(404).json({
        error: { code: 'FILE_NOT_FOUND', message: 'File not found' }
      });
    }

    const fileData = await filesService.getFileData(fileId, userId);

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileId}"`);
    res.setHeader('X-File-Metadata', JSON.stringify(file.encrypted_metadata));
    res.send(fileData);
  } catch (error: any) {
    console.error('Download file error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to download file' }
    });
  }
});

/**
 * DELETE /api/v1/vault/files/:id
 * Delete a file
 */
router.delete('/files/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const fileId = req.params.id;

    const deleted = await filesService.deleteFile(fileId, userId);

    if (!deleted) {
      return res.status(404).json({
        error: { code: 'FILE_NOT_FOUND', message: 'File not found' }
      });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete file error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete file' }
    });
  }
});

/**
 * GET /api/v1/vault/search
 * Search records and files
 */
router.get('/search', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const q = req.query.q as string;
    const type = req.query.type as string;
    const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const results: any[] = [];

    // Search records
    if (!type || type === 'record') {
      const recordsResult = await recordsService.listRecords({
        userId,
        page,
        limit,
        search: q,
        tags
      });

      results.push(...recordsResult.records.map(record => ({
        type: 'record',
        id: record.id,
        encrypted_metadata: record.encrypted_metadata,
        tags: record.tags,
        created_at: record.created_at
      })));
    }

    // Search files
    if (!type || type === 'file') {
      const filesResult = await filesService.listFiles({
        userId,
        page,
        limit,
        search: q
      });

      results.push(...filesResult.files.map(file => ({
        type: 'file',
        id: file.id,
        encrypted_metadata: file.encrypted_metadata,
        mime_type: file.mime_type,
        created_at: file.created_at
      })));
    }

    res.json({
      results,
      pagination: {
        page,
        limit,
        total: results.length
      }
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to search' }
    });
  }
});

/**
 * GET /api/v1/vault/templates
 * List templates
 */
router.get('/templates', authenticate, async (req: Request, res: Response) => {
  try {
    const templates = await templatesService.listTemplates();
    res.json({ templates });
  } catch (error: any) {
    console.error('List templates error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list templates' }
    });
  }
});

/**
 * GET /api/v1/vault/templates/:type
 * Get template by type
 */
router.get('/templates/:type', authenticate, async (req: Request, res: Response) => {
  try {
    const type = req.params.type;
    const template = await templatesService.getTemplateByType(type);

    if (!template) {
      return res.status(404).json({
        error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' }
      });
    }

    res.json(template);
  } catch (error: any) {
    console.error('Get template error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get template' }
    });
  }
});

export default router;

