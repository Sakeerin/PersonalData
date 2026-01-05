import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { apiLimiter } from '../middleware/rateLimit';
import * as alertService from '../services/alertService';
import * as incidentService from '../alerts/incident';
import * as responseActions from '../services/responseActions';
import { AlertSeverity, AlertStatus } from '../alerts/rules';

const router = Router();

/**
 * GET /api/v1/alerts
 * List alerts for user
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const severity = req.query.severity as AlertSeverity | undefined;
    const status = req.query.status as AlertStatus | undefined;
    const limit = parseInt(req.query.limit as string) || 50;

    const alerts = await alertService.listAlerts(userId, severity, status, limit);

    res.json({
      alerts: alerts.map(alert => ({
        id: alert.id,
        rule_id: alert.rule_id,
        severity: alert.severity,
        status: alert.status,
        message: alert.message,
        metadata: alert.metadata,
        created_at: alert.created_at
      }))
    });
  } catch (error: any) {
    console.error('List alerts error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list alerts' }
    });
  }
});

/**
 * POST /api/v1/alerts/:alert_id/acknowledge
 * Acknowledge an alert
 */
router.post('/:alert_id/acknowledge', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const alertId = req.params.alert_id;

    const acknowledged = await alertService.acknowledgeAlert(alertId, userId);

    if (!acknowledged) {
      return res.status(404).json({
        error: { code: 'ALERT_NOT_FOUND', message: 'Alert not found or already acknowledged' }
      });
    }

    res.json({
      alert_id: alertId,
      status: 'acknowledged'
    });
  } catch (error: any) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to acknowledge alert' }
    });
  }
});

/**
 * POST /api/v1/alerts/:alert_id/resolve
 * Resolve an alert
 */
router.post('/:alert_id/resolve', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const alertId = req.params.alert_id;

    const resolved = await alertService.resolveAlert(alertId, userId);

    if (!resolved) {
      return res.status(404).json({
        error: { code: 'ALERT_NOT_FOUND', message: 'Alert not found' }
      });
    }

    res.json({
      alert_id: alertId,
      status: 'resolved'
    });
  } catch (error: any) {
    console.error('Resolve alert error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve alert' }
    });
  }
});

/**
 * POST /api/v1/alerts/panic
 * Trigger panic mode
 */
router.post('/panic', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { reason } = req.body;

    // Create critical alert for panic mode
    const alertId = await alertService.createAlert(
      userId,
      'panic_mode',
      `Panic mode activated: ${reason || 'User triggered'}`,
      'critical',
      { reason, user_triggered: true }
    );

    // Get incident
    const incident = await incidentService.getIncidentByAlert(alertId);
    const incidentId = incident?.id;

    // Activate panic mode
    await responseActions.activatePanicMode(userId, incidentId);

    res.json({
      triggered: true,
      actions_taken: [
        'revoked_sessions',
        'revoked_shares',
        'locked_vault'
      ],
      alert_id: alertId
    });
  } catch (error: any) {
    console.error('Panic mode error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to activate panic mode' }
    });
  }
});

/**
 * GET /api/v1/alerts/incidents
 * List incidents for user
 */
router.get('/incidents', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 50;

    const incidents = await incidentService.listIncidents(userId, limit);

    // Get alert details for each incident
    const incidentsWithAlerts = await Promise.all(
      incidents.map(async (incident) => {
        const alert = await alertService.getAlert(incident.alert_id);
        return {
          id: incident.id,
          alert_id: incident.alert_id,
          alert: alert ? {
            severity: alert.severity,
            message: alert.message,
            created_at: alert.created_at
          } : null,
          action_taken: incident.action_taken,
          resolved_at: incident.resolved_at,
          created_at: incident.created_at
        };
      })
    );

    res.json({ incidents: incidentsWithAlerts });
  } catch (error: any) {
    console.error('List incidents error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list incidents' }
    });
  }
});

/**
 * POST /api/v1/alerts/incidents/:incident_id/resolve
 * Resolve an incident
 */
router.post('/incidents/:incident_id/resolve', authenticate, async (req: Request, res: Response) => {
  try {
    const incidentId = req.params.incident_id;

    const resolved = await incidentService.resolveIncident(incidentId);

    if (!resolved) {
      return res.status(404).json({
        error: { code: 'INCIDENT_NOT_FOUND', message: 'Incident not found or already resolved' }
      });
    }

    res.json({
      incident_id: incidentId,
      resolved_at: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Resolve incident error:', error);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve incident' }
    });
  }
});

export default router;

