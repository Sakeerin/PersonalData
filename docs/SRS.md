# Software Requirements Specification (SRS)
## Personal Data Vault System

**Version:** 1.0  
**Date:** 2024  
**Status:** Draft

---

## 1. Introduction

### 1.1 Purpose

This document specifies the requirements for a Personal Data Vault system that enables users to store, manage, and share personal data with end-to-end encryption (E2EE) and comprehensive security controls.

### 1.2 Scope

The system provides:
- Secure storage for structured records and unstructured files
- End-to-end encryption with user-controlled keys
- Fine-grained access control and sharing mechanisms
- Comprehensive audit logging
- Risk detection and alerting
- Data Subject Rights (DSR) compliance workflows

### 1.3 Definitions

- **E2EE**: End-to-End Encryption - encryption where only the end users can decrypt data
- **KEK**: Key Encryption Key - master key used to wrap data keys
- **DEK**: Data Encryption Key - key used to encrypt individual items
- **DSR**: Data Subject Rights - rights under data protection regulations
- **MFA**: Multi-Factor Authentication
- **RBAC**: Role-Based Access Control
- **ABAC**: Attribute-Based Access Control

---

## 2. System Overview

### 2.1 System Objectives

1. Enable users to store personal data with E2EE protection
2. Provide granular access control and sharing capabilities
3. Maintain comprehensive audit trails
4. Detect and alert on security risks
5. Support Data Subject Rights workflows

### 2.2 User Roles

- **End User (Owner)**: Owner of data in vault
- **Trusted Delegate**: Person granted access to specific data
- **Service App / Third-party**: External application accessing data via API
- **Org Admin**: Organization policy administrator (if org mode)
- **Security Analyst / Support**: Limited-privilege access to telemetry

---

## 3. Functional Requirements

### 3.1 Data Storage

#### FR-DATA-01
**Requirement**: System must support structured records and unstructured files with metadata (owner, timestamps, tags, sensitivity labels, retention policies, sharing policies).

**Priority**: High

#### FR-DATA-02
**Requirement**: System must support data templates for document types (e.g., ID card, insurance policy, rental contract).

**Priority**: Medium

### 3.2 Encryption & Security

#### FR-SEC-01
**Requirement**: All personal data payloads must be encrypted before storage (AES-256-GCM or equivalent).

**Priority**: Critical

#### FR-SEC-02
**Requirement**: Key derivation must use strong KDF (e.g., Argon2id) for passwords/secrets.

**Priority**: Critical

#### FR-SEC-03
**Requirement**: Each record/file must use a unique data key (DEK), wrapped with KEK.

**Priority**: Critical

#### FR-SEC-04
**Requirement**: System must support KEK rotation without decrypting all data.

**Priority**: High

#### FR-SEC-05
**Requirement**: System must verify ciphertext integrity (AEAD) and support versioning.

**Priority**: High

### 3.3 Key Management

#### FR-KEY-01
**Requirement**: Users must have Master Key/Root Secret (not stored plaintext on server).

**Priority**: Critical

#### FR-KEY-02
**Requirement**: System must support multiple devices with secure key sync (key wrapping + device keys).

**Priority**: High

#### FR-KEY-03
**Requirement**: System must provide recovery mechanisms (recovery codes in MVP, social recovery/hardware keys future).

**Priority**: High

#### FR-KEY-04
**Requirement**: Device management must support revocation (revoked device cannot decrypt).

**Priority**: High

### 3.4 Authentication

#### FR-AUTH-01
**Requirement**: System must require MFA/2FA (TOTP/Passkeys) - at least one method in MVP.

**Priority**: High

#### FR-AUTH-02
**Requirement**: Session tokens must be short-lived with refresh rotation and device-bound sessions.

**Priority**: High

#### FR-AUTH-03
**Requirement**: System must detect anomalous logins (geo/IP change, impossible travel, new device).

**Priority**: Medium

#### FR-AUTH-04
**Requirement**: System must implement rate limiting and bot protection.

**Priority**: High

### 3.5 Access Control

#### FR-ACL-01
**Requirement**: Sharing must support fine-grained scope (field-level or document-level).

**Priority**: High

#### FR-ACL-02
**Requirement**: System must support time-bound access (automatic expiry).

**Priority**: High

#### FR-ACL-03
**Requirement**: System must support one-time access links with immediate revocation.

**Priority**: High

#### FR-ACL-04
**Requirement**: System must capture purpose/objective when sharing (recorded in audit).

**Priority**: Medium

#### FR-ACL-05
**Requirement**: System must maintain consent receipts (who/what/when/how long).

**Priority**: Medium

### 3.6 Audit Logging

#### FR-AUD-01
**Requirement**: System must maintain append-only audit logs for: login/logout, MFA changes, device management, data operations, sharing operations, exports/downloads, failed decrypt attempts, policy violations.

**Priority**: High

#### FR-AUD-02
**Requirement**: Audit logs must not expose plaintext PII but must support investigation (hash pointers, IDs).

**Priority**: High

#### FR-AUD-03
**Requirement**: System must support audit log export for users (DSR transparency).

**Priority**: Medium

### 3.7 Alerts

#### FR-ALRT-01
**Requirement**: System must alert on: new device login, unusual geo/IP, burst access/exports, share link abuse, repeated decrypt failures, critical policy changes.

**Priority**: High

#### FR-ALRT-02
**Requirement**: Alerts must have severity levels (info/warn/critical).

**Priority**: Medium

#### FR-ALRT-03
**Requirement**: System must support response actions: force re-auth, revoke sessions, panic mode, notifications, incident reports.

**Priority**: High

### 3.8 Data Subject Rights

#### FR-DSR-01
**Requirement**: Right to Access - export all data as ZIP (JSON + files).

**Priority**: High

#### FR-DSR-02
**Requirement**: Right to Portability - export in standard formats (JSON/CSV).

**Priority**: Medium

#### FR-DSR-03
**Requirement**: Right to Erasure - delete account, destroy keys, tombstone logs per retention policy.

**Priority**: High

#### FR-DSR-04
**Requirement**: Right to Rectification - enable data correction.

**Priority**: Medium

#### FR-DSR-05
**Requirement**: Consent Withdrawal - revoke app/delegate access.

**Priority**: High

#### FR-DSR-06
**Requirement**: Retention Controls - set retention period per category.

**Priority**: Medium

### 3.9 User Interface

#### FR-UX-01
**Requirement**: System must provide security checklist showing: MFA status, recovery setup, trusted devices.

**Priority**: Medium

#### FR-UX-02
**Requirement**: All risky actions must require confirmation with explanation (share, export, delete).

**Priority**: Medium

### 3.10 Search

#### FR-SRCH-01
**Requirement**: System must support search by metadata/tags/labels without exposing sensitive data.

**Priority**: High

#### FR-SRCH-02
**Requirement**: (Optional) Private search with encrypted index (Phase 2).

**Priority**: Low

#### FR-SRCH-03
**Requirement**: (Optional) Full-text search in files, client-side only (Phase 2).

**Priority**: Low

---

## 4. Non-Functional Requirements

### 4.1 Performance

- p95 list/search metadata < 300ms
- Upload 50MB file < 30s (network dependent) with resumable upload
- API response times < 500ms (p95)

### 4.2 Availability & Reliability

- 99.9% uptime for core API (production)
- Encrypted backups with tested restore procedures
- Idempotency for upload/export/delete operations

### 4.3 Security

- Secure SDLC: dependency scanning, SAST, secrets scanning
- Pen-test readiness: threat model and abuse cases documented
- WAF and rate limiting

### 4.4 Scalability

- Support 10,000+ users (MVP)
- Support 1M+ records per user
- Support file sizes up to 100MB (MVP)

---

## 5. Threat Model Requirements

#### FR-THRT-01
**Requirement**: System must have documented threat model covering: server compromise, token theft, malicious delegate, MITM, device theft, insider threat.

**Priority**: High

#### FR-THRT-02
**Requirement**: Mitigations must map to controls: encryption, key management, audit, alerts, least privilege.

**Priority**: High

---

## 6. Acceptance Criteria

### Security/Keys
- AT-SEC-01: Server DB dump must contain only ciphertext, no plaintext
- AT-SEC-02: Revoked device cannot decrypt data
- AT-SEC-03: Key rotation maintains access on trusted devices

### Access Control
- AT-ACL-01: Expired share links cannot be accessed
- AT-ACL-02: Revoked shares cannot be used
- AT-ACL-03: Field-level shares show only permitted fields

### Alerts
- AT-ALRT-01: New device login triggers alert within 1 minute
- AT-ALRT-02: Bulk export triggers critical alert; panic mode works

### DSR
- AT-DSR-01: Export is complete and verifiable (checksum)
- AT-DSR-02: Account deletion performs crypto-erasure immediately

---

## 7. Out of Scope (Future Phases)

- Identity verification (eKYC)
- Personal finance aggregation (Open Banking)
- Full password manager replacement
- Advanced integrations (email forward, cloud drive sync)

---

## 8. Definitions of Done

- All risky features have audit events
- All sensitive data encrypted before storage
- Integration tests for auth/ACL/sharing/export/delete
- Incident response runbook and log retention policy
- Backup/restore procedures tested


