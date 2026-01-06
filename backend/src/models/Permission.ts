/**
 * Permission database model
 */

export interface PermissionRow {
  id: string;
  share_id: string;
  action: string;
  conditions: any; // JSONB
  created_at: Date;
}

export interface CreatePermissionData {
  share_id: string;
  action: string;
  conditions?: any;
}

