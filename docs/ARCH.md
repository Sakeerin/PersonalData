# Architecture Documentation
## Personal Data Vault System

**Version:** 1.0  
**Date:** 2024

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

The system follows a monolith architecture with clear module boundaries, enabling future extraction to microservices if needed.

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   React UI   │  │  Crypto Lib  │  │  Key Manager │ │
│  │  (Next.js)   │  │  (E2EE)      │  │  (KEK/DEK)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS (encrypted transport)
┌───────────────────────▼─────────────────────────────────┐
│              Backend API (Node.js/TS)                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│  │  Auth   │ │  Vault  │ │  Access │ │  Audit  │     │
│  │  + MFA  │ │ Storage │ │ Control │ │  Logs   │     │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│  │ Alerts  │ │   DSR   │ │  Device │                  │
│  │ Engine  │ │Workflows│ │  Mgmt   │                  │
│  └─────────┘ └─────────┘ └─────────┘                  │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│              PostgreSQL Database                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Users   │ │  Vault   │ │  Audit   │ │  Keys    │ │
│  │  Tables  │ │ (Cipher) │ │  Logs    │ │ (Wrapped)│ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

- **Backend Framework**: Node.js + TypeScript + Express
- **Frontend Framework**: Next.js 14+ (App Router) + React + TypeScript
- **Database**: PostgreSQL 14+ (with JSONB support)
- **Cryptography**: Web Crypto API (browser) + Node.js crypto (server) + Argon2id
- **Authentication**: JWT (access tokens) + Refresh tokens
- **MFA**: TOTP (Time-based One-Time Password)

---

## 2. Module Architecture

### 2.1 Module Structure

```
backend/src/
├── crypto/          # Cryptographic operations
├── auth/            # Authentication & MFA
├── vault/           # Data storage (records & files)
├── access/          # Access control & sharing
├── audit/           # Audit logging
├── alerts/          # Risk detection & alerts
├── dsr/             # Data Subject Rights workflows
├── models/          # Database models (ORM)
├── routes/          # API route handlers
├── middleware/      # Express middleware
├── services/        # Business logic services
├── utils/           # Utilities
└── config/          # Configuration

frontend/src/
├── app/             # Next.js App Router pages
├── components/      # React components
├── lib/             # Libraries & utilities
│   ├── crypto/      # Client-side crypto
│   └── api/         # API client
├── hooks/           # React hooks
└── styles/          # Styling
```

### 2.2 Module Dependencies

```
Crypto (Module 1)
  ↓
Auth (Module 2) ──→ Vault (Module 3) ──→ Access Control (Module 4)
                              ↓                    ↓
                         Audit (Module 5)    Alerts (Module 6)
                              ↓                    ↓
                         DSR (Module 7) ──────────┘
                              ↓
                         Frontend (Module 8)
```

---

## 3. Data Flow

### 3.1 Data Storage Flow (E2EE)

```
User Input (Plaintext)
  ↓
Client: Generate/Retrieve DEK
  ↓
Client: Encrypt data with DEK (AES-256-GCM)
  ↓
Client: Wrap DEK with KEK
  ↓
HTTPS → Server: Store (ciphertext + wrapped DEK)
  ↓
Database: Encrypted Record/File
```

### 3.2 Data Retrieval Flow

```
User Request
  ↓
Server: Retrieve ciphertext + wrapped DEK
  ↓
HTTPS → Client: Ciphertext + wrapped DEK
  ↓
Client: Unwrap DEK with KEK
  ↓
Client: Decrypt data with DEK
  ↓
User: Plaintext (never leaves client)
```

### 3.3 Sharing Flow

```
Owner: Create Share
  ↓
Server: Generate share token
  ↓
Server: Store share permission (encrypted metadata only)
  ↓
Recipient: Access with token
  ↓
Server: Verify permission + expiry
  ↓
Server: Return ciphertext (same as owner)
  ↓
Recipient: Decrypt with own keys (if delegated) or view-only
```

---

## 4. Database Schema

### 4.1 Core Tables

#### users
- `id` (UUID, PK)
- `email` (VARCHAR, UNIQUE)
- `password_hash` (VARCHAR)
- `mfa_secret` (VARCHAR, encrypted)
- `recovery_codes_hash` (JSONB)
- `created_at`, `updated_at` (TIMESTAMP)

#### devices
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `device_key_wrapped` (BYTEA) - wrapped device key
- `device_name` (VARCHAR)
- `device_fingerprint` (VARCHAR)
- `trusted` (BOOLEAN)
- `last_seen` (TIMESTAMP)
- `created_at` (TIMESTAMP)

#### sessions
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `device_id` (UUID, FK → devices)
- `refresh_token_hash` (VARCHAR)
- `access_token_jti` (VARCHAR) - JWT ID
- `expires_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)

### 4.2 Vault Tables

#### records
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `type` (VARCHAR) - record type/template
- `encrypted_data` (BYTEA) - AES-256-GCM ciphertext
- `encrypted_metadata` (JSONB) - encrypted metadata (searchable fields encrypted)
- `tags` (TEXT[]) - unencrypted tags for search
- `labels` (VARCHAR[]) - sensitivity labels
- `retention_policy` (JSONB)
- `created_at`, `updated_at` (TIMESTAMP)

#### files
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `encrypted_file_path` (VARCHAR) - path to encrypted file
- `encrypted_metadata` (JSONB)
- `mime_type` (VARCHAR)
- `size` (BIGINT) - encrypted size
- `checksum` (VARCHAR) - hash of encrypted file
- `retention_policy` (JSONB)
- `created_at`, `updated_at` (TIMESTAMP)

#### record_attachments
- `id` (UUID, PK)
- `record_id` (UUID, FK → records)
- `file_id` (UUID, FK → files)

### 4.3 Key Management Tables

#### user_keys
- `id` (UUID, PK)
- `user_id` (UUID, FK → users, UNIQUE)
- `kek_wrapped` (BYTEA) - KEK wrapped with recovery key (optional)
- `key_version` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)

#### data_keys
- `id` (UUID, PK)
- `record_id` (UUID, FK → records, nullable)
- `file_id` (UUID, FK → files, nullable)
- `dek_wrapped` (BYTEA) - DEK wrapped with KEK
- `key_id` (UUID, FK → user_keys)
- `created_at` (TIMESTAMP)

### 4.4 Access Control Tables

#### shares
- `id` (UUID, PK)
- `owner_id` (UUID, FK → users)
- `resource_type` (VARCHAR) - 'record' | 'file' | 'collection'
- `resource_id` (UUID)
- `share_type` (VARCHAR) - 'delegate' | 'app' | 'link'
- `token` (VARCHAR, UNIQUE) - share token
- `expires_at` (TIMESTAMP, nullable)
- `purpose` (TEXT)
- `created_at` (TIMESTAMP)

#### permissions
- `id` (UUID, PK)
- `share_id` (UUID, FK → shares)
- `action` (VARCHAR) - 'read' | 'view_metadata' | 'edit' | 'share' | 'download' | 'delete'
- `conditions` (JSONB) - time-based, field-level, etc.
- `created_at` (TIMESTAMP)

#### consents
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `subject_id` (UUID) - delegate or app ID
- `resource_ids` (UUID[])
- `purpose` (TEXT)
- `granted_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP, nullable)
- `withdrawn_at` (TIMESTAMP, nullable)

### 4.5 Audit & Alerts Tables

#### audit_logs
- `id` (UUID, PK)
- `user_id` (UUID, FK → users, nullable)
- `event_type` (VARCHAR)
- `resource_type` (VARCHAR, nullable)
- `resource_id` (UUID, nullable)
- `action` (VARCHAR)
- `metadata` (JSONB) - no plaintext PII
- `ip_address` (INET)
- `user_agent` (TEXT)
- `timestamp` (TIMESTAMP, default now())
- `hash_chain` (VARCHAR, nullable) - for tamper detection

#### alerts
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `rule_id` (VARCHAR)
- `severity` (VARCHAR) - 'info' | 'warn' | 'critical'
- `status` (VARCHAR) - 'active' | 'acknowledged' | 'resolved'
- `metadata` (JSONB)
- `created_at` (TIMESTAMP)

#### incidents
- `id` (UUID, PK)
- `alert_id` (UUID, FK → alerts)
- `action_taken` (TEXT[])
- `resolved_at` (TIMESTAMP, nullable)
- `created_at` (TIMESTAMP)

---

## 5. API Design

### 5.1 API Structure

Base URL: `/api/v1`

### 5.2 Authentication

- Access tokens: JWT, short-lived (15 minutes)
- Refresh tokens: long-lived (7 days), rotated on use
- Token format: `Bearer <token>`

### 5.3 Endpoint Categories

- `/api/v1/auth/*` - Authentication & MFA
- `/api/v1/vault/*` - Vault operations (records/files)
- `/api/v1/sharing/*` - Sharing & access control
- `/api/v1/audit/*` - Audit log queries
- `/api/v1/alerts/*` - Alerts & incidents
- `/api/v1/dsr/*` - Data Subject Rights
- `/api/v1/devices/*` - Device management

---

## 6. Security Architecture

### 6.1 Encryption Model

- **E2EE**: All data encrypted client-side before storage
- **KEK**: Derived from user password/secret via Argon2id
- **DEK**: Per-item keys, wrapped with KEK
- **Device Keys**: For multi-device key sync

### 6.2 Key Management

- KEK never stored plaintext on server
- DEKs wrapped with KEK before storage
- Key rotation: re-wrap DEKs with new KEK
- Recovery: recovery codes, future social recovery

### 6.3 Access Control

- RBAC/ABAC hybrid model
- Field-level permissions for structured data
- Time-bound access
- Consent tracking

### 6.4 Audit & Compliance

- Append-only audit logs
- No plaintext PII in logs
- Export capability for DSR
- Retention policies

---

## 7. Deployment Architecture

### 7.1 Development

- Local PostgreSQL instance
- Node.js backend (Express)
- Next.js frontend (dev server)
- File storage: local filesystem

### 7.2 Production (Future)

- Containerized deployment (Docker)
- PostgreSQL with encrypted volumes
- File storage: S3-compatible with encryption
- CDN for static assets
- Load balancer
- WAF protection

---

## 8. Scalability Considerations

- Database indexing on frequently queried fields
- Pagination for list endpoints
- Async processing for exports/deletions
- Caching for metadata queries (encrypted cache)
- Horizontal scaling ready (stateless backend)

---

## 9. Monitoring & Observability

- Application logs (structured JSON)
- Metrics (request rates, latency, errors)
- Audit logs (security events)
- Alert system (anomaly detection)

---

## 10. Future Enhancements

- Microservices extraction (auth service, vault service, etc.)
- Multi-region deployment
- Advanced search (encrypted index)
- Webhook system for integrations
- API for third-party apps (OAuth2)


