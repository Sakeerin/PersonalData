/**
 * Access Control module exports
 */

// Permissions
export {
  checkPermission,
  checkFieldAccess,
  filterFields,
  createPermission,
  combinePermissions,
  type Action,
  type ResourceType,
  type Permission,
  type PermissionConditions,
  type AccessRequest,
  type AccessContext
} from './permissions';

// Sharing
export {
  createShare,
  getShareByToken,
  getSharePermissions,
  checkShareAccess,
  listShares,
  revokeShare,
  revokeAllSharesForResource,
  cleanupExpiredShares,
  type ShareType,
  type ShareRow,
  type CreateShareData
} from './sharing';

// Consent
export {
  createConsent,
  getConsent,
  isConsentValid,
  checkConsent,
  listConsents,
  withdrawConsent,
  getConsentHistory,
  type ConsentRow,
  type CreateConsentData
} from './consent';

