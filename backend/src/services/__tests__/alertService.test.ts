import { createAlert, listAlerts, acknowledgeAlert } from '../alertService';

// Mock dependencies
jest.mock('../../utils/db', () => ({
  query: jest.fn()
}));

jest.mock('../alerts/notifier', () => ({
  notificationManager: {
    send: jest.fn().mockResolvedValue(true)
  }
}));

jest.mock('../alerts/incident', () => ({
  createIncident: jest.fn().mockResolvedValue('incident1')
}));

jest.mock('../../audit/logger', () => ({
  logSecurityEvent: jest.fn().mockResolvedValue('log1')
}));

import { query } from '../../utils/db';

describe('Alert Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (query as jest.Mock).mockResolvedValue({ rows: [] });
  });

  describe('createAlert', () => {
    it('should create an alert', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce({}) // Insert alert
        .mockResolvedValueOnce({ rows: [{ id: 'alert1' }] }); // Get alert

      const alertId = await createAlert(
        'user1',
        'new_device_login',
        'New device detected',
        'warn',
        {}
      );

      expect(alertId).toBeTruthy();
      expect(query).toHaveBeenCalled();
    });
  });

  describe('listAlerts', () => {
    it('should list alerts for user', async () => {
      (query as jest.Mock).mockResolvedValueOnce({
        rows: [
          {
            id: 'alert1',
            user_id: 'user1',
            rule_id: 'new_device_login',
            severity: 'warn',
            status: 'active',
            message: 'New device detected',
            metadata: {},
            created_at: new Date()
          }
        ]
      });

      const alerts = await listAlerts('user1');

      expect(alerts.length).toBe(1);
      expect(alerts[0].rule_id).toBe('new_device_login');
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', async () => {
      (query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1
      });

      const acknowledged = await acknowledgeAlert('alert1', 'user1');

      expect(acknowledged).toBe(true);
    });
  });
});

