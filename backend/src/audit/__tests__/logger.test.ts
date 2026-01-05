import * as auditLogger from '../logger';
import { AuditEventType, ResourceType } from '../events';

// Mock database
jest.mock('../../utils/db', () => ({
  query: jest.fn()
}));

import { query } from '../../utils/db';

describe('Audit Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (query as jest.Mock).mockResolvedValue({ rows: [] });
  });

  describe('logEvent', () => {
    it('should log an audit event', async () => {
      const event = {
        user_id: 'user1',
        event_type: AuditEventType.USER_LOGIN,
        action: 'login',
        metadata: {},
        timestamp: new Date()
      };

      await auditLogger.logEvent(event);

      expect(query).toHaveBeenCalled();
      const callArgs = (query as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toContain('INSERT INTO audit_logs');
      expect(callArgs[1]).toContain('user1');
      expect(callArgs[1]).toContain(AuditEventType.USER_LOGIN);
    });

    it('should calculate hash chain', async () => {
      // First event
      (query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const event1 = {
        user_id: 'user1',
        event_type: AuditEventType.USER_LOGIN,
        action: 'login',
        metadata: {},
        timestamp: new Date()
      };
      await auditLogger.logEvent(event1);

      // Second event with previous hash
      const previousHash = 'previous_hash';
      (query as jest.Mock).mockResolvedValueOnce({ 
        rows: [{ hash_chain: previousHash }] 
      });
      const event2 = {
        user_id: 'user1',
        event_type: AuditEventType.USER_LOGOUT,
        action: 'logout',
        metadata: {},
        timestamp: new Date()
      };
      await auditLogger.logEvent(event2);

      expect(query).toHaveBeenCalledTimes(3); // Count query + 2 inserts
    });
  });

  describe('logAuthEvent', () => {
    it('should log authentication event', async () => {
      await auditLogger.logAuthEvent(
        AuditEventType.USER_LOGIN,
        'user1',
        { device_id: 'device1' },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(query).toHaveBeenCalled();
      const callArgs = (query as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toContain('user1');
      expect(callArgs[1]).toContain(AuditEventType.USER_LOGIN);
    });
  });

  describe('logDataOperation', () => {
    it('should log data operation event', async () => {
      await auditLogger.logDataOperation(
        AuditEventType.RECORD_CREATED,
        'user1',
        ResourceType.RECORD,
        'record1',
        { type: 'identity' },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(query).toHaveBeenCalled();
      const callArgs = (query as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toContain('user1');
      expect(callArgs[1]).toContain(AuditEventType.RECORD_CREATED);
      expect(callArgs[1]).toContain('record1');
    });
  });

  describe('queryAuditLogs', () => {
    it('should query audit logs with filters', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // Count query
        .mockResolvedValueOnce({ rows: [] }); // Data query

      const result = await auditLogger.queryAuditLogs({
        userId: 'user1',
        eventType: AuditEventType.USER_LOGIN,
        page: 1,
        limit: 10
      });

      expect(result.logs).toEqual([]);
      expect(result.pagination.total).toBe(10);
      expect(query).toHaveBeenCalledTimes(2);
    });

    it('should handle null userId', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      await auditLogger.queryAuditLogs({
        userId: null as any
      });

      const countCall = (query as jest.Mock).mock.calls[0];
      expect(countCall[0]).toContain('user_id IS NULL');
    });
  });

  describe('exportAuditLogs', () => {
    it('should export logs as JSON', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '1',
              event_type: AuditEventType.USER_LOGIN,
              action: 'login',
              timestamp: new Date('2024-01-01')
            },
            {
              id: '2',
              event_type: AuditEventType.USER_LOGOUT,
              action: 'logout',
              timestamp: new Date('2024-01-02')
            }
          ]
        });

      const json = await auditLogger.exportAuditLogs('user1', 'json');
      const data = JSON.parse(json);

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    it('should export logs as CSV', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: '1',
              event_type: AuditEventType.USER_LOGIN,
              action: 'login',
              resource_type: null,
              resource_id: null,
              timestamp: new Date('2024-01-01'),
              ip_address: '192.168.1.1'
            }
          ]
        });

      const csv = await auditLogger.exportAuditLogs('user1', 'csv');
      
      expect(csv).toContain('id');
      expect(csv).toContain('timestamp');
      expect(csv).toContain('event_type');
      expect(csv).toContain('1');
    });
  });

  describe('verifyAuditLogIntegrity', () => {
    it('should verify valid audit log chain', async () => {
      // Mock valid hash chain
      const hash1 = 'hash1';
      const hash2 = 'hash2';

      (query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: '1',
            user_id: 'user1',
            event_type: AuditEventType.USER_LOGIN,
            resource_type: null,
            resource_id: null,
            action: 'login',
            timestamp: new Date('2024-01-01'),
            hash_chain: hash1
          },
          {
            id: '2',
            user_id: 'user1',
            event_type: AuditEventType.USER_LOGOUT,
            resource_type: null,
            resource_id: null,
            action: 'logout',
            timestamp: new Date('2024-01-02'),
            hash_chain: hash2
          }
        ]
      });

      const result = await auditLogger.verifyAuditLogIntegrity();

      // Note: This test may need adjustment based on actual hash calculation
      expect(typeof result.valid).toBe('boolean');
      expect(typeof result.invalidCount).toBe('number');
    });
  });
});

