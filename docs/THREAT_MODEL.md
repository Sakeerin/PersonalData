# Threat Model
## Personal Data Vault System

**Version:** 1.0  
**Date:** 2024

---

## 1. Overview

This document identifies threats, attack vectors, and mitigations for the Personal Data Vault system. The system stores sensitive personal data with end-to-end encryption, making server compromise less critical but still requiring comprehensive security controls.

---

## 2. Threat Categories

### 2.1 Server Compromise

**Threat**: Attacker gains control of backend server or database.

**Attack Vectors:**
- SQL injection
- Remote code execution (RCE)
- Privilege escalation
- Database access via compromised credentials

**Impact**: 
- High (could access encrypted data and metadata)
- Cannot decrypt data without user keys (E2EE protection)
- Could potentially modify or delete data

**Mitigations:**
- **FR-SEC-01**: All data encrypted client-side (AES-256-GCM)
- **FR-KEY-01**: KEK never stored plaintext on server
- Input validation and parameterized queries
- Least privilege database access
- Regular security updates
- Database encryption at rest
- Network segmentation
- Intrusion detection

**Residual Risk**: Medium (data remains encrypted, but metadata exposure and service disruption possible)

---

### 2.2 Token Theft

**Threat**: Attacker steals authentication tokens (access/refresh tokens).

**Attack Vectors:**
- XSS (Cross-Site Scripting) - steal tokens from localStorage/sessionStorage
- Man-in-the-Middle (MITM) attacks
- Token leakage in logs/monitoring
- Client-side malware

**Impact**:
- High (could access user's vault)
- Cannot decrypt data without user's KEK (E2EE protection)

**Mitigations:**
- **FR-AUTH-02**: Short-lived access tokens (15 min), refresh token rotation
- **FR-AUTH-01**: MFA required for sensitive operations
- **FR-AUTH-03**: Anomaly detection (unusual access patterns)
- HTTP-only cookies for refresh tokens (future)
- SameSite cookie attributes
- CSP (Content Security Policy) headers
- Device binding for sessions
- Token revocation mechanism

**Residual Risk**: Low (tokens short-lived, MFA required, device binding)

---

### 2.3 Malicious Delegate

**Threat**: Trusted delegate misuses access or becomes compromised.

**Attack Vectors:**
- Delegate shares data with unauthorized parties
- Compromised delegate account
- Delegate exceeds authorized scope

**Impact**:
- Medium-High (depends on scope of access granted)

**Mitigations:**
- **FR-ACL-01**: Fine-grained permissions (field-level, document-level)
- **FR-ACL-02**: Time-bound access (automatic expiry)
- **FR-ACL-04**: Purpose limitation (recorded in audit)
- **FR-ACL-05**: Consent receipts (track who accessed what)
- **FR-AUD-01**: Comprehensive audit logging of all access
- **FR-ALRT-01**: Alerts on unusual access patterns
- Regular review of active shares

**Residual Risk**: Medium (managed through scope limitations and monitoring)

---

### 2.4 Man-in-the-Middle (MITM)

**Threat**: Attacker intercepts communication between client and server.

**Attack Vectors:**
- Compromised network infrastructure
- Malicious proxy/VPN
- DNS hijacking
- Certificate authority compromise

**Impact**:
- High (could intercept encrypted data and tokens)
- Cannot decrypt data in transit without breaking TLS (E2EE data still encrypted)

**Mitigations:**
- **HTTPS/TLS 1.3**: All communication encrypted in transit
- Certificate pinning (future)
- HSTS headers
- TLS termination at load balancer (trusted infrastructure)
- User education (verify certificates)

**Residual Risk**: Low (TLS protection, E2EE provides additional layer)

---

### 2.5 Client Device Theft/Loss

**Threat**: Physical or logical compromise of user's device.

**Attack Vectors:**
- Lost/stolen device
- Device malware
- Unauthorized physical access
- Keyloggers

**Impact**:
- High if device is unlocked and keys are in memory
- Medium if device is locked (keys encrypted at rest)

**Mitigations:**
- **FR-KEY-04**: Device management - ability to revoke devices
- **FR-AUTH-01**: MFA required (additional factor needed)
- **FR-AUTH-02**: Short-lived sessions
- **FR-ALRT-01**: Alert on new device login
- Device encryption (OS-level)
- Secure key storage (browser secure storage, keychain)
- Auto-logout after inactivity
- Biometric authentication for key access (future)

**Residual Risk**: Medium (mitigated by device revocation and MFA)

---

### 2.6 Insider Threat

**Threat**: Malicious or compromised employee/administrator.

**Attack Vectors:**
- Database administrator accessing encrypted data
- Support staff with excessive privileges
- Compromised admin account

**Impact**:
- Low-Medium (cannot decrypt data due to E2EE)
- Could delete/modify data or disrupt service
- Could access metadata and audit logs

**Mitigations:**
- **FR-AUD-01**: Audit all admin actions
- **FR-ALRT-01**: Alert on privileged operations
- Least privilege access control
- Separation of duties
- Regular access reviews
- Background checks for staff
- Encrypted backups (admin cannot decrypt)
- Multi-person approval for sensitive operations (future)

**Residual Risk**: Low (E2EE prevents data access, monitoring prevents abuse)

---

### 2.7 Social Engineering

**Threat**: Attacker tricks user into revealing credentials or keys.

**Attack Vectors:**
- Phishing emails
- Fake login pages
- Phone/SMS scams
- Recovery code requests

**Impact**:
- High if user reveals password/recovery codes

**Mitigations**:
- **FR-AUTH-01**: MFA (additional factor)
- **FR-KEY-03**: Recovery codes (user-controlled)
- User education
- Official communication channels only
- No password recovery via email (only recovery codes)
- Rate limiting on login attempts

**Residual Risk**: Medium (user-dependent, mitigated by MFA)

---

### 2.8 Key Recovery Attack

**Threat**: Attacker attempts to recover user's master key.

**Attack Vectors:**
- Brute force password attack
- Recovery code brute force
- Side-channel attacks on key derivation

**Impact**:
- Critical (full access to user's data)

**Mitigations**:
- **FR-SEC-02**: Strong KDF (Argon2id) with high cost parameters
- **FR-KEY-03**: Recovery codes (long, random, limited attempts)
- Rate limiting on authentication
- Account lockout after failed attempts
- Password strength requirements
- Key derivation with salt (unique per user)

**Residual Risk**: Very Low (strong KDF makes brute force infeasible)

---

### 2.9 Data Exfiltration Patterns

**Threat**: Attacker attempts to export large amounts of data.

**Attack Vectors:**
- Automated bulk export via API
- Account takeover with export
- Malicious delegate exports data

**Impact**:
- High (privacy breach, data loss)

**Mitigations**:
- **FR-ALRT-01**: Alert on bulk exports
- **FR-ALRT-03**: Panic mode (lock vault, revoke shares)
- Rate limiting on export endpoints
- Export approval workflow (future)
- Watermarking (future)
- Monitoring export volumes

**Residual Risk**: Low-Medium (detected and alerted)

---

### 2.10 Denial of Service (DoS)

**Threat**: Attacker disrupts service availability.

**Attack Vectors:**
- DDoS attacks
- Resource exhaustion
- Database connection exhaustion

**Impact**:
- Medium (service unavailability, but data remains secure)

**Mitigations**:
- **FR-AUTH-04**: Rate limiting
- DDoS protection (WAF, CDN)
- Resource quotas per user
- Connection pooling
- Caching for frequently accessed data
- Auto-scaling infrastructure (future)

**Residual Risk**: Low-Medium (managed through infrastructure)

---

## 3. Threat Matrix

| Threat | Likelihood | Impact | Risk Level | Mitigations |
|--------|-----------|--------|------------|-------------|
| Server Compromise | Medium | High | Medium | E2EE, encryption at rest, least privilege |
| Token Theft | Medium | High | Medium | Short tokens, MFA, device binding |
| Malicious Delegate | Low | Medium | Low-Medium | Fine-grained ACL, audit, alerts |
| MITM | Low | High | Low | TLS, HSTS, E2EE |
| Device Theft | Medium | High | Medium | Device revocation, MFA, encryption |
| Insider Threat | Low | Low-Medium | Low | Audit, least privilege, E2EE |
| Social Engineering | Medium | High | Medium | MFA, education, no password recovery |
| Key Recovery | Very Low | Critical | Very Low | Strong KDF, rate limiting |
| Data Exfiltration | Low | High | Low-Medium | Alerts, rate limiting, panic mode |
| DoS | Medium | Medium | Low-Medium | Rate limiting, DDoS protection |

---

## 4. Security Controls Summary

### Encryption
- E2EE (AES-256-GCM) for all data
- KEK derived via Argon2id
- Per-item DEKs
- Key wrapping for storage

### Authentication & Authorization
- MFA (TOTP)
- Short-lived tokens
- Device binding
- Fine-grained permissions

### Monitoring & Response
- Comprehensive audit logging
- Real-time alerts
- Anomaly detection
- Panic mode

### Operational Security
- Least privilege access
- Secure development lifecycle
- Regular security updates
- Incident response procedures

---

## 5. Abuse Cases

### UC-ABUSE-01: Bulk Data Export
**Scenario**: Attacker compromises account and exports all data.
**Mitigation**: Alert on bulk export, panic mode, rate limiting.

### UC-ABUSE-02: Token Replay
**Scenario**: Attacker replays stolen token after expiry.
**Mitigation**: Token expiration, refresh token rotation, device binding.

### UC-ABUSE-03: Share Link Abuse
**Scenario**: Share link shared publicly or repeatedly accessed.
**Mitigation**: One-time links, access limits, alert on abuse patterns.

### UC-ABUSE-04: Password Spraying
**Scenario**: Attacker attempts common passwords across many accounts.
**Mitigation**: Rate limiting, account lockout, MFA requirement.

### UC-ABUSE-05: Metadata Enumeration
**Scenario**: Attacker enumerates user data via metadata queries.
**Mitigation**: Minimal metadata exposure, encrypted metadata fields, access controls.

---

## 6. Compliance Considerations

- GDPR: Right to access, erasure, portability (covered by DSR workflows)
- Data minimization: Store only necessary data, encrypted metadata
- Purpose limitation: Track and enforce purpose of access
- Consent management: Consent receipts and withdrawal
- Breach notification: Alert system enables rapid response

---

## 7. Review and Updates

This threat model should be reviewed:
- After major feature additions
- After security incidents
- Annually or when threat landscape changes
- Before security audits/penetration tests


