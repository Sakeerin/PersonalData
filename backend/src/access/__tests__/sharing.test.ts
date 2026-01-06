import { createShare, getShareByToken, revokeShare, listShares } from '../sharing';
import { createPermission } from '../permissions';

// Mock database
jest.mock('../../utils/db', () => ({
  query: jest.fn(),
  transaction: jest.fn()
}));

import { query, transaction } from '../../utils/db';

describe('Sharing Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (query as jest.Mock).mockResolvedValue({ rows: [] });
    (transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] })
      };
      return callback(mockClient);
    });
  });

  describe('createShare', () => {
    it('should create a share with permissions', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({}) // Share insert
          .mockResolvedValueOnce({}) // Permission insert
      };

      (transaction as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await createShare({
        owner_id: 'user1',
        resource_type: 'record',
        resource_id: 'record1',
        share_type: 'link',
        permissions: [createPermission('read')]
      });

      expect(result.shareId).toBeTruthy();
      expect(result.token).toBeTruthy();
    });
  });

  describe('getShareByToken', () => {
    it('should return share for valid token', async () => {
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'share1',
          owner_id: 'user1',
          resource_type: 'record',
          resource_id: 'record1',
          share_type: 'link',
          token: 'token123',
          expires_at: null,
          purpose: 'Test',
          created_at: new Date()
        }]
      });

      const share = await getShareByToken('token123');

      expect(share).toBeTruthy();
      expect(share?.token).toBe('token123');
    });

    it('should return null for expired share', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'share1',
          expires_at: expiredDate
        }]
      });

      const share = await getShareByToken('token123');

      expect(share).toBeNull();
    });
  });

  describe('revokeShare', () => {
    it('should revoke a share', async () => {
      (query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1
      });

      const revoked = await revokeShare('share1', 'user1');

      expect(revoked).toBe(true);
    });
  });
});

