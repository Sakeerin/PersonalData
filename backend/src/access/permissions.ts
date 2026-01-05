/**
 * ABAC/RBAC Permission Engine
 * Supports Attribute-Based and Role-Based Access Control
 */

export type Action = 'read' | 'view_metadata' | 'edit' | 'share' | 'download' | 'delete';
export type ResourceType = 'record' | 'file' | 'collection';

export interface Permission {
  action: Action;
  conditions?: PermissionConditions;
}

export interface PermissionConditions {
  // Time-based conditions
  validFrom?: Date;
  validUntil?: Date;
  
  // Field-level permissions (for structured data)
  allowedFields?: string[];
  deniedFields?: string[];
  
  // IP/Device restrictions
  allowedIPs?: string[];
  allowedDevices?: string[];
  
  // Purpose limitation
  purpose?: string;
  
  // One-time access
  oneTime?: boolean;
  used?: boolean;
  
  // Approval required
  requiresApproval?: boolean;
  approved?: boolean;
}

export interface AccessRequest {
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  action: Action;
  context?: AccessContext;
}

export interface AccessContext {
  ipAddress?: string;
  deviceId?: string;
  timestamp?: Date;
  purpose?: string;
}

/**
 * Check if permission allows action
 */
export function checkPermission(
  permission: Permission,
  request: AccessRequest
): { allowed: boolean; reason?: string } {
  // Check action
  if (permission.action !== request.action) {
    return { allowed: false, reason: 'Action not permitted' };
  }

  // Check conditions
  if (permission.conditions) {
    const conditions = permission.conditions;

    // Time-based checks
    const now = request.context?.timestamp || new Date();
    if (conditions.validFrom && now < conditions.validFrom) {
      return { allowed: false, reason: 'Permission not yet valid' };
    }
    if (conditions.validUntil && now > conditions.validUntil) {
      return { allowed: false, reason: 'Permission expired' };
    }

    // One-time access check
    if (conditions.oneTime && conditions.used) {
      return { allowed: false, reason: 'One-time access already used' };
    }

    // IP restriction
    if (conditions.allowedIPs && request.context?.ipAddress) {
      if (!conditions.allowedIPs.includes(request.context.ipAddress)) {
        return { allowed: false, reason: 'IP address not allowed' };
      }
    }

    // Device restriction
    if (conditions.allowedDevices && request.context?.deviceId) {
      if (!conditions.allowedDevices.includes(request.context.deviceId)) {
        return { allowed: false, reason: 'Device not allowed' };
      }
    }

    // Approval check
    if (conditions.requiresApproval && !conditions.approved) {
      return { allowed: false, reason: 'Approval required' };
    }
  }

  return { allowed: true };
}

/**
 * Check if field access is allowed (for field-level permissions)
 */
export function checkFieldAccess(
  permission: Permission,
  fieldName: string
): boolean {
  if (!permission.conditions) {
    return true; // No restrictions
  }

  const { allowedFields, deniedFields } = permission.conditions;

  // Explicitly denied
  if (deniedFields && deniedFields.includes(fieldName)) {
    return false;
  }

  // If allowedFields specified, only those are allowed
  if (allowedFields) {
    return allowedFields.includes(fieldName);
  }

  return true;
}

/**
 * Filter data based on field-level permissions
 */
export function filterFields(
  data: Record<string, any>,
  permission: Permission
): Record<string, any> {
  if (!permission.conditions || !permission.conditions.allowedFields) {
    return data; // No field restrictions
  }

  const filtered: Record<string, any> = {};
  for (const field of permission.conditions.allowedFields) {
    if (field in data) {
      filtered[field] = data[field];
    }
  }

  return filtered;
}

/**
 * Create permission from action and optional conditions
 */
export function createPermission(
  action: Action,
  conditions?: PermissionConditions
): Permission {
  return {
    action,
    conditions
  };
}

/**
 * Combine multiple permissions
 */
export function combinePermissions(permissions: Permission[]): Permission[] {
  return permissions;
}

