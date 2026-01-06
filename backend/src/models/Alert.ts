/**
 * Alert database model
 */

export interface AlertRow {
  id: string;
  user_id: string;
  rule_id: string;
  severity: string;
  status: string;
  message: string;
  metadata: any; // JSONB
  created_at: Date;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
}

export interface CreateAlertData {
  user_id: string;
  rule_id: string;
  severity: string;
  message: string;
  metadata?: any;
}

export interface UpdateAlertData {
  status?: string;
  acknowledged_at?: Date | null;
  resolved_at?: Date | null;
}

