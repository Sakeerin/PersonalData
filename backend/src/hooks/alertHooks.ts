/**
 * Hooks for triggering alert checks
 * These should be called from various parts of the application
 */

import { checkAlertRules } from '../services/alertService';
import { AuditEventType } from '../audit/events';

/**
 * Hook: Check alerts after login
 */
export async function onUserLogin(
  userId: string,
  deviceId: string,
  deviceName: string,
  ipAddress: string,
  trusted: boolean,
  geoLocation?: { country?: string; city?: string }
): Promise<void> {
  await checkAlertRules(userId, {
    userId,
    eventType: AuditEventType.USER_LOGIN,
    metadata: {
      device_id: deviceId,
      device_name: deviceName,
      trusted,
      ip_address: ipAddress,
      geo_location: geoLocation
    },
    timestamp: new Date()
  });
}

/**
 * Hook: Check alerts after data export
 */
export async function onDataExport(
  userId: string,
  format: string
): Promise<void> {
  await checkAlertRules(userId, {
    userId,
    eventType: AuditEventType.DATA_EXPORTED,
    metadata: {
      format
    },
    timestamp: new Date()
  });
}

/**
 * Hook: Check alerts after decrypt failure
 */
export async function onDecryptFailure(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<void> {
  await checkAlertRules(userId, {
    userId,
    eventType: AuditEventType.DECRYPT_FAILED,
    metadata: {
      resource_type: resourceType,
      resource_id: resourceId
    },
    timestamp: new Date()
  });
}

/**
 * Hook: Check alerts after share access
 */
export async function onShareAccess(
  ownerId: string,
  shareToken: string,
  shareType: string,
  ipAddress: string
): Promise<void> {
  await checkAlertRules(ownerId, {
    userId: ownerId,
    eventType: AuditEventType.SHARE_ACCESSED,
    metadata: {
      share_token: shareToken,
      share_type: shareType,
      ip_address: ipAddress
    },
    timestamp: new Date()
  });
}

