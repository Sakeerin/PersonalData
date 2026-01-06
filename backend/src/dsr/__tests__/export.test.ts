import { createExportJob, getExportJob, exportDataAsJSON } from '../export';

// Mock dependencies
jest.mock('../../utils/db', () => ({
  query: jest.fn()
}));

jest.mock('../../vault/records', () => ({
  listRecords: jest.fn()
}));

jest.mock('../../vault/files', () => ({
  listFiles: jest.fn()
}));

import { query } from '../../utils/db';
import * as recordsService from '../../vault/records';
import * as filesService from '../../vault/files';

describe('Export Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExportJob', () => {
    it('should create an export job', async () => {
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const jobId = await createExportJob('user1', 'zip');

      expect(jobId).toBeTruthy();
      expect(query).toHaveBeenCalled();
    });
  });

  describe('getExportJob', () => {
    it('should get export job by ID', async () => {
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'job1',
          user_id: 'user1',
          status: 'completed',
          format: 'zip',
          file_path: 'exports/job1.zip',
          created_at: new Date()
        }]
      });

      const job = await getExportJob('job1', 'user1');

      expect(job).toBeTruthy();
      expect(job?.status).toBe('completed');
    });
  });

  describe('exportDataAsJSON', () => {
    it('should export data as JSON', async () => {
      (recordsService.listRecords as jest.Mock).mockResolvedValueOnce({
        records: [],
        pagination: { total: 0 }
      });

      (filesService.listFiles as jest.Mock).mockResolvedValueOnce({
        files: [],
        pagination: { total: 0 }
      });

      const json = await exportDataAsJSON('user1');

      expect(json).toHaveProperty('export_date');
      expect(json).toHaveProperty('user_id', 'user1');
      expect(json).toHaveProperty('records');
      expect(json).toHaveProperty('files');
    });
  });
});

