# API Documentation
## Personal Data Vault System

**Version:** 1.0  
**Base URL**: `/api/v1`  
**Date:** 2024

---

## 1. Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### 1.1 Register User

**POST** `/api/v1/auth/register`

Create a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "secure_password_123",
  "device_name": "My Laptop",
  "device_fingerprint": "browser_fingerprint_string"
}
```

**Response** (201 Created):
```json
{
  "user_id": "uuid",
  "access_token": "jwt_token",
  "refresh_token": "refresh_token_string",
  "expires_in": 900
}
```

**Errors**:
- 400: Invalid input, email already exists
- 500: Server error

---

### 1.2 Login

**POST** `/api/v1/auth/login`

Authenticate user and receive tokens.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "secure_password_123",
  "mfa_code": "123456",
  "device_name": "My Laptop",
  "device_fingerprint": "browser_fingerprint_string"
}
```

**Response** (200 OK):
```json
{
  "user_id": "uuid",
  "access_token": "jwt_token",
  "refresh_token": "refresh_token_string",
  "expires_in": 900,
  "mfa_required": false
}
```

**Errors**:
- 401: Invalid credentials, MFA required (if mfa_required: true in response)
- 429: Rate limited
- 500: Server error

---

### 1.3 Refresh Token

**POST** `/api/v1/auth/refresh`

Obtain new access token using refresh token.

**Request Body**:
```json
{
  "refresh_token": "refresh_token_string"
}
```

**Response** (200 OK):
```json
{
  "access_token": "new_jwt_token",
  "refresh_token": "new_refresh_token_string",
  "expires_in": 900
}
```

**Errors**:
- 401: Invalid or expired refresh token
- 500: Server error

---

### 1.4 Enable MFA

**POST** `/api/v1/auth/mfa/enable`

Enable TOTP-based MFA for user.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "secret": "base32_encoded_secret",
  "qr_code_url": "data:image/png;base64,...",
  "recovery_codes": ["CODE1", "CODE2", ...]
}
```

**Errors**:
- 401: Unauthorized
- 409: MFA already enabled

---

### 1.5 Verify MFA

**POST** `/api/v1/auth/mfa/verify`

Verify and complete MFA setup.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "code": "123456"
}
```

**Response** (200 OK):
```json
{
  "verified": true
}
```

---

### 1.6 List Sessions

**GET** `/api/v1/auth/sessions`

List all active sessions for user.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "sessions": [
    {
      "id": "uuid",
      "device_name": "My Laptop",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2024-01-01T00:00:00Z",
      "last_activity": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

### 1.7 Revoke Session

**DELETE** `/api/v1/auth/sessions/:session_id`

Revoke a specific session.

**Headers**: `Authorization: Bearer <token>`

**Response** (204 No Content)

---

### 1.8 Register Device

**POST** `/api/v1/auth/devices/register`

Register a new trusted device.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "device_name": "My Phone",
  "device_fingerprint": "device_fingerprint_string",
  "device_key_wrapped": "base64_encoded_wrapped_key"
}
```

**Response** (201 Created):
```json
{
  "device_id": "uuid",
  "trusted": true
}
```

---

### 1.9 List Devices

**GET** `/api/v1/auth/devices`

List all registered devices.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "devices": [
    {
      "id": "uuid",
      "device_name": "My Laptop",
      "trusted": true,
      "last_seen": "2024-01-01T12:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 1.10 Revoke Device

**DELETE** `/api/v1/auth/devices/:device_id`

Revoke a device (prevents decryption).

**Headers**: `Authorization: Bearer <token>`

**Response** (204 No Content)

---

## 2. Vault Operations

### 2.1 List Records

**GET** `/api/v1/vault/records`

List user's records with pagination.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)
- `type`: Filter by record type
- `tags`: Filter by tags (comma-separated)
- `search`: Search in metadata/tags

**Response** (200 OK):
```json
{
  "records": [
    {
      "id": "uuid",
      "type": "identity",
      "encrypted_data": "base64_ciphertext",
      "encrypted_metadata": {...},
      "tags": ["important"],
      "labels": ["sensitive"],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "total_pages": 2
  }
}
```

---

### 2.2 Create Record

**POST** `/api/v1/vault/records`

Create a new record.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "type": "identity",
  "encrypted_data": "base64_ciphertext",
  "encrypted_metadata": {
    "encrypted_fields": "base64_encrypted_metadata"
  },
  "tags": ["important"],
  "labels": ["sensitive"],
  "retention_policy": {
    "retain_until": "2025-01-01T00:00:00Z"
  },
  "dek_wrapped": "base64_wrapped_dek"
}
```

**Response** (201 Created):
```json
{
  "id": "uuid",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### 2.3 Get Record

**GET** `/api/v1/vault/records/:record_id`

Get a specific record.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "id": "uuid",
  "type": "identity",
  "encrypted_data": "base64_ciphertext",
  "encrypted_metadata": {...},
  "tags": ["important"],
  "labels": ["sensitive"],
  "dek_wrapped": "base64_wrapped_dek",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### 2.4 Update Record

**PUT** `/api/v1/vault/records/:record_id`

Update an existing record.

**Headers**: `Authorization: Bearer <token>`

**Request Body**: Same as create, all fields optional

**Response** (200 OK):
```json
{
  "id": "uuid",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

### 2.5 Delete Record

**DELETE** `/api/v1/vault/records/:record_id`

Delete a record.

**Headers**: `Authorization: Bearer <token>`

**Response** (204 No Content)

---

### 2.6 Upload File

**POST** `/api/v1/vault/files`

Upload a file (multipart/form-data).

**Headers**: `Authorization: Bearer <token>`

**Form Data**:
- `file`: Encrypted file (binary)
- `encrypted_metadata`: JSON string with metadata
- `mime_type`: MIME type
- `dek_wrapped`: Base64 wrapped DEK
- `tags`: JSON array of tags
- `labels`: JSON array of labels

**Response** (201 Created):
```json
{
  "id": "uuid",
  "size": 1024,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### 2.7 Get File

**GET** `/api/v1/vault/files/:file_id`

Download a file.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
- Content-Type: `application/octet-stream` or original mime_type
- Body: Encrypted file binary
- Headers: `X-Dek-Wrapped`, `X-File-Metadata`

---

### 2.8 Delete File

**DELETE** `/api/v1/vault/files/:file_id`

Delete a file.

**Headers**: `Authorization: Bearer <token>`

**Response** (204 No Content)

---

### 2.9 Search

**GET** `/api/v1/vault/search`

Search records and files by metadata/tags.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `q`: Search query
- `type`: Filter by type (record/file)
- `tags`: Filter by tags
- `page`, `limit`: Pagination

**Response** (200 OK):
```json
{
  "results": [
    {
      "type": "record",
      "id": "uuid",
      "encrypted_metadata": {...},
      "tags": ["important"],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

## 3. Sharing & Access Control

### 3.1 Create Share

**POST** `/api/v1/sharing/share`

Create a share (delegate/app/link).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "resource_type": "record",
  "resource_id": "uuid",
  "share_type": "link",
  "expires_at": "2024-12-31T23:59:59Z",
  "purpose": "Medical records review",
  "permissions": [
    {
      "action": "read",
      "conditions": {
        "fields": ["name", "date_of_birth"]
      }
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "share_id": "uuid",
  "token": "share_token_string",
  "share_url": "https://vault.example.com/shared/:token",
  "expires_at": "2024-12-31T23:59:59Z"
}
```

---

### 3.2 List Shares

**GET** `/api/v1/sharing/shares`

List active shares.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `resource_type`: Filter by resource type
- `resource_id`: Filter by resource ID

**Response** (200 OK):
```json
{
  "shares": [
    {
      "id": "uuid",
      "resource_type": "record",
      "resource_id": "uuid",
      "share_type": "link",
      "expires_at": "2024-12-31T23:59:59Z",
      "purpose": "Medical records review",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 3.3 Revoke Share

**DELETE** `/api/v1/sharing/shares/:share_id`

Revoke a share.

**Headers**: `Authorization: Bearer <token>`

**Response** (204 No Content)

---

### 3.4 Access Shared Resource

**POST** `/api/v1/sharing/access/:token`

Access a shared resource (for recipients).

**Request Body** (optional):
```json
{
  "consent_granted": true
}
```

**Response** (200 OK):
```json
{
  "resource_type": "record",
  "encrypted_data": "base64_ciphertext",
  "dek_wrapped": "base64_wrapped_dek",
  "permissions": [...],
  "expires_at": "2024-12-31T23:59:59Z"
}
```

---

## 4. Audit Logs

### 4.1 Query Audit Logs

**GET** `/api/v1/audit/logs`

Query audit logs with filters.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `event_type`: Filter by event type
- `resource_type`: Filter by resource type
- `resource_id`: Filter by resource ID
- `start_date`, `end_date`: Date range
- `page`, `limit`: Pagination

**Response** (200 OK):
```json
{
  "logs": [
    {
      "id": "uuid",
      "event_type": "record.read",
      "resource_type": "record",
      "resource_id": "uuid",
      "action": "read",
      "metadata": {...},
      "ip_address": "192.168.1.1",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 4.2 Export Audit Logs

**GET** `/api/v1/audit/export`

Export audit logs (DSR).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**: Same as query

**Response** (200 OK):
- Content-Type: `application/json` or `text/csv`
- Body: Audit log data

---

## 5. Alerts

### 5.1 List Alerts

**GET** `/api/v1/alerts`

List user's alerts.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `severity`: Filter by severity (info/warn/critical)
- `status`: Filter by status (active/acknowledged/resolved)
- `page`, `limit`: Pagination

**Response** (200 OK):
```json
{
  "alerts": [
    {
      "id": "uuid",
      "rule_id": "new_device_login",
      "severity": "warn",
      "status": "active",
      "message": "Login from new device",
      "metadata": {...},
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 5.2 Trigger Panic Mode

**POST** `/api/v1/alerts/panic`

Trigger panic mode (revoke all sessions, lock vault).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "reason": "Suspicious activity detected"
}
```

**Response** (200 OK):
```json
{
  "triggered": true,
  "actions_taken": [
    "revoked_sessions",
    "revoked_shares",
    "locked_vault"
  ]
}
```

---

### 5.3 List Incidents

**GET** `/api/v1/alerts/incidents`

List security incidents.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "incidents": [
    {
      "id": "uuid",
      "alert_id": "uuid",
      "action_taken": ["revoked_sessions"],
      "resolved_at": null,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 6. Data Subject Rights (DSR)

### 6.1 Request Data Export

**POST** `/api/v1/dsr/export`

Request data export (async job).

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "format": "zip",
  "include_files": true
}
```

**Response** (202 Accepted):
```json
{
  "job_id": "uuid",
  "status": "pending",
  "estimated_completion": "2024-01-01T01:00:00Z"
}
```

---

### 6.2 Get Export Status

**GET** `/api/v1/dsr/export/:job_id`

Get export job status.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "job_id": "uuid",
  "status": "completed",
  "download_url": "https://vault.example.com/exports/:job_id",
  "expires_at": "2024-01-02T00:00:00Z"
}
```

---

### 6.3 Download Export

**GET** `/api/v1/dsr/export/:job_id/download`

Download exported data.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
- Content-Type: `application/zip`
- Body: ZIP file with JSON and files

---

### 6.4 Delete Account

**POST** `/api/v1/dsr/delete-account`

Delete user account with crypto-erasure.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "password": "user_password",
  "confirmation": "DELETE"
}
```

**Response** (202 Accepted):
```json
{
  "status": "deletion_initiated",
  "completion_time": "2024-01-01T01:00:00Z"
}
```

---

### 6.5 Withdraw Consent

**POST** `/api/v1/dsr/withdraw-consent/:consent_id`

Withdraw a consent.

**Headers**: `Authorization: Bearer <token>`

**Response** (200 OK):
```json
{
  "consent_id": "uuid",
  "withdrawn_at": "2024-01-01T00:00:00Z"
}
```

---

## 7. Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {...}
  }
}
```

**HTTP Status Codes**:
- 400: Bad Request (validation errors)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (resource already exists)
- 429: Too Many Requests (rate limited)
- 500: Internal Server Error
- 503: Service Unavailable

---

## 8. Rate Limiting

Rate limits apply per user/IP:
- Authentication endpoints: 5 requests/minute
- General API endpoints: 100 requests/minute
- Export/delete operations: 10 requests/hour
- File upload: 50MB/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```


