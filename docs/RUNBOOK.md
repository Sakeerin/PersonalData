# Operations Runbook
## Personal Data Vault System

**Version:** 1.0  
**Date:** 2024

---

## 1. Overview

This runbook provides operational procedures for running, monitoring, and maintaining the Personal Data Vault system.

---

## 2. System Architecture Summary

- **Backend**: Node.js/TypeScript (Express)
- **Frontend**: Next.js/React
- **Database**: PostgreSQL
- **File Storage**: Local filesystem (dev) / S3 (production)
- **Encryption**: E2EE (client-side)

---

## 3. Deployment Procedures

### 3.1 Initial Setup

#### Database Setup

```bash
# Create database
createdb personal_data_vault

# Run migrations
cd backend
npm run db:migrate

# Seed initial data (if needed)
npm run db:seed
```

#### Environment Configuration

Required environment variables:

**Backend (.env)**:
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/personal_data_vault
JWT_SECRET=<random_32_bytes>
JWT_REFRESH_SECRET=<random_32_bytes>
ENCRYPTION_KEY=<random_32_bytes_for_optional_server_encryption>
FILE_STORAGE_PATH=/var/vault/files
LOG_LEVEL=info
```

**Frontend (.env.local)**:
```
NEXT_PUBLIC_API_URL=https://api.vault.example.com
NEXT_PUBLIC_APP_URL=https://vault.example.com
```

#### Application Deployment

```bash
# Build applications
npm run build

# Start backend
cd backend
npm start

# Start frontend (or serve static files)
cd frontend
npm start
```

---

## 4. Monitoring

### 4.1 Health Checks

**Health Endpoint**: `GET /health`

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 4.2 Key Metrics

Monitor:
- API response times (p50, p95, p99)
- Error rates (4xx, 5xx)
- Database connection pool usage
- Disk space (file storage)
- Memory usage
- CPU usage
- Active sessions
- Failed authentication attempts

### 4.3 Logging

**Log Levels**:
- `error`: Errors requiring attention
- `warn`: Warnings (failed auth, rate limits)
- `info`: General information (requests, operations)
- `debug`: Detailed debugging information

**Log Format**: Structured JSON

**Important Log Events**:
- Authentication failures
- Authorization failures
- Key operations (rotation, revocation)
- Share creation/revocation
- Export/deletion operations
- Alert triggers
- Panic mode activations

---

## 5. Backup Procedures

### 5.1 Database Backups

**Daily Backup**:
```bash
pg_dump -F c -b -v -f backup_$(date +%Y%m%d).dump personal_data_vault
```

**Backup Retention**:
- Daily backups: 30 days
- Weekly backups: 12 weeks
- Monthly backups: 12 months

**Encryption**: Backups should be encrypted at rest (PGP or encrypted storage)

### 5.2 File Storage Backups

**Procedure**:
- Sync encrypted files to backup storage (S3, etc.)
- Verify file integrity (checksums)
- Test restore procedures regularly

### 5.3 Backup Testing

**Monthly**: Test restore from backup
- Restore to test database
- Verify data integrity
- Verify encryption/decryption works

---

## 6. Incident Response

### 6.1 Security Incidents

#### Suspected Breach

1. **Immediate Actions**:
   - Review audit logs for suspicious activity
   - Check for unauthorized access patterns
   - Review recent authentication failures
   - Check for unusual export/deletion activity

2. **Investigation**:
   - Identify scope of potential breach
   - Review affected users
   - Check for data exfiltration patterns
   - Review system logs

3. **Containment**:
   - Revoke suspected compromised sessions/tokens
   - Lock affected user accounts (if needed)
   - Isolate affected systems (if infrastructure compromise)

4. **Notification**:
   - Notify affected users (if data exposure confirmed)
   - Document incident
   - Prepare incident report

#### Data Corruption

1. **Detection**: Monitor error logs, user reports
2. **Investoration**: Identify affected records/files
3. **Recovery**: Restore from backups
4. **Verification**: Verify data integrity
5. **Notification**: Inform affected users

### 6.2 Service Outages

#### Database Connection Issues

1. Check database service status
2. Verify connection pool settings
3. Check network connectivity
4. Review database logs
5. Restart database if needed
6. Restart application if needed

#### Application Crashes

1. Check application logs
2. Review recent changes/deployments
3. Check resource usage (memory, CPU)
4. Restart application
5. Rollback if recent deployment caused issue

#### High Load

1. Check request rates
2. Identify resource bottlenecks
3. Scale horizontally (if supported)
4. Enable rate limiting (if disabled)
5. Consider temporary service degradation

---

## 7. Maintenance Procedures

### 7.1 Database Maintenance

#### Vacuum and Analyze

```sql
-- Vacuum and analyze tables
VACUUM ANALYZE;

-- Vacuum specific table
VACUUM ANALYZE records;
```

**Schedule**: Weekly

#### Index Maintenance

```sql
-- Rebuild indexes if needed
REINDEX DATABASE personal_data_vault;
```

**Schedule**: Monthly or as needed

### 7.2 Log Rotation

**Application Logs**:
- Rotate daily
- Compress after rotation
- Retain 90 days

**Audit Logs**:
- Retain per retention policy (minimum 1 year)
- Archive older logs
- Encrypt archived logs

### 7.3 Cleanup Tasks

#### Expired Sessions

**Procedure**: Automated job runs daily
```sql
DELETE FROM sessions WHERE expires_at < NOW();
```

#### Expired Shares

**Procedure**: Automated job runs daily
```sql
DELETE FROM shares WHERE expires_at < NOW() AND expires_at IS NOT NULL;
```

#### Soft-Deleted Records

**Procedure**: Automated job runs weekly (after retention period)
```sql
DELETE FROM records 
WHERE deleted_at < NOW() - INTERVAL '30 days' 
AND deleted_at IS NOT NULL;
```

### 7.4 Security Updates

**Schedule**: Monthly security updates
1. Review security advisories
2. Update dependencies
3. Test in staging
4. Deploy to production
5. Monitor for issues

---

## 8. User Support Procedures

### 8.1 Password Reset

**Note**: System does not support password reset (E2EE design). Users must use recovery codes.

**Support**:
1. Verify user identity (out-of-band)
2. Guide user to use recovery codes
3. If recovery codes lost, account cannot be recovered (by design)

### 8.2 Account Recovery

**Procedure**:
1. User provides recovery codes
2. System verifies recovery codes
3. User sets new password
4. User re-derives KEK (data remains encrypted)

### 8.3 Data Export Requests (DSR)

**Procedure**:
1. User initiates export via UI/API
2. System generates export (async job)
3. User downloads export
4. Export link expires after 7 days
5. Log export in audit log

### 8.4 Account Deletion Requests (DSR)

**Procedure**:
1. User initiates deletion via UI/API
2. System performs crypto-erasure (marks keys for deletion)
3. Schedule data deletion per retention policy
4. Log deletion in audit log (tombstone)
5. Confirm deletion to user

---

## 9. Troubleshooting

### 9.1 Common Issues

#### High Database Connections

**Symptoms**: Connection pool exhaustion
**Solutions**:
- Increase connection pool size
- Check for connection leaks
- Review long-running queries
- Add database read replicas

#### Slow Queries

**Symptoms**: High response times
**Solutions**:
- Review query execution plans
- Add indexes
- Optimize queries
- Consider query caching

#### File Upload Failures

**Symptoms**: Uploads timeout or fail
**Solutions**:
- Check file size limits
- Verify disk space
- Check network connectivity
- Review upload timeout settings

#### Memory Leaks

**Symptoms**: Increasing memory usage over time
**Solutions**:
- Profile application
- Review object lifecycle
- Check for event listener leaks
- Restart application periodically (if needed)

---

## 10. Disaster Recovery

### 10.1 Recovery Procedures

#### Full System Recovery

1. **Restore Database**:
   ```bash
   pg_restore -d personal_data_vault backup.dump
   ```

2. **Restore Files**:
   - Sync files from backup storage
   - Verify file integrity

3. **Verify System**:
   - Check database connectivity
   - Verify encryption/decryption
   - Test authentication
   - Verify file access

4. **Notify Users**:
   - Inform users of service restoration
   - Provide status update

#### Partial Recovery

1. Identify affected data
2. Restore from backups
3. Verify data integrity
4. Notify affected users

### 10.2 Recovery Time Objectives (RTO)

- **Critical**: 4 hours
- **Important**: 24 hours
- **Normal**: 72 hours

### 10.3 Recovery Point Objectives (RPO)

- **Database**: 1 hour (hourly backups)
- **Files**: 24 hours (daily backups)

---

## 11. Compliance & Auditing

### 11.1 Audit Log Review

**Schedule**: Weekly review of security events
- Failed authentication attempts
- Unusual access patterns
- Share creation/revocation
- Export/deletion operations
- Privilege escalations

### 11.2 Compliance Checks

**Monthly**:
- Review data retention policies
- Verify encryption at rest
- Check access controls
- Review incident logs
- Verify backup procedures

### 11.3 Security Audits

**Annual**:
- External security audit
- Penetration testing
- Code review
- Infrastructure review

---

## 12. Contact Information

**On-Call Engineer**: [Contact Info]  
**Security Team**: [Contact Info]  
**Database Administrator**: [Contact Info]  
**Escalation**: [Contact Info]

---

## 13. Appendix

### 13.1 Useful Commands

```bash
# Check database size
psql -c "SELECT pg_size_pretty(pg_database_size('personal_data_vault'));"

# Check table sizes
psql -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Count records per user
psql -c "SELECT user_id, COUNT(*) FROM records GROUP BY user_id ORDER BY COUNT(*) DESC LIMIT 10;"

# Check active sessions
psql -c "SELECT COUNT(*) FROM sessions WHERE expires_at > NOW();"
```

### 13.2 Log Locations

- Application logs: `/var/log/vault/app.log`
- Audit logs: Database table `audit_logs`
- Error logs: `/var/log/vault/error.log`
- Access logs: `/var/log/vault/access.log`

---

**Last Updated**: 2024-01-01  
**Next Review**: 2024-04-01


