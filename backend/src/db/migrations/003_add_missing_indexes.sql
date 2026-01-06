-- Additional indexes for performance

-- Export jobs indexes (if not already in 002)
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON export_jobs(created_at);

-- Additional indexes for audit logs queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_timestamp ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type_timestamp ON audit_logs(event_type, timestamp DESC);

-- Indexes for shares
CREATE INDEX IF NOT EXISTS idx_shares_owner_id_created_at ON shares(owner_id, created_at DESC);

-- Indexes for consents
CREATE INDEX IF NOT EXISTS idx_consents_user_id_granted_at ON consents(user_id, granted_at DESC);
CREATE INDEX IF NOT EXISTS idx_consents_subject_id ON consents(subject_id);

