# Cryptographic Specification
## Personal Data Vault System

**Version:** 1.0  
**Date:** 2024

---

## 1. Overview

This document specifies the cryptographic algorithms, key management, and encryption protocols used in the Personal Data Vault system. The system implements End-to-End Encryption (E2EE) where the server cannot decrypt user data.

---

## 2. Encryption Model

### 2.1 Architecture

The system uses a hierarchical key structure:

```
User Password/Secret
    ↓ (Argon2id KDF)
Master Key (KEK - Key Encryption Key)
    ↓ (Key Wrapping)
Data Keys (DEK - Data Encryption Key, one per item)
    ↓ (AES-256-GCM)
Encrypted Data
```

### 2.2 Principles

- **Zero-Knowledge**: Server never has access to plaintext keys or data
- **Per-Item Encryption**: Each record/file has a unique DEK
- **Key Separation**: KEK and DEKs are cryptographically separated
- **Forward Secrecy**: Key rotation does not require re-encryption of all data

---

## 3. Key Derivation

### 3.1 Master Key (KEK) Derivation

**Algorithm**: Argon2id  
**Purpose**: Derive KEK from user password/secret

**Parameters**:
- **Memory**: 64 MB (65536 KB)
- **Iterations**: 3
- **Parallelism**: 4
- **Output Length**: 32 bytes (256 bits)
- **Salt**: 16 bytes, unique per user, stored with user record

**Rationale**:
- Argon2id is memory-hard, resistant to GPU/ASIC attacks
- Parameters provide good security/performance balance
- Salt ensures uniqueness even with identical passwords

**Implementation**:
```typescript
import argon2 from 'argon2';

const kek = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
  salt: userSalt  // 16 bytes, unique per user
});
```

---

## 4. Data Encryption

### 4.1 Algorithm: AES-256-GCM

**Algorithm**: AES (Advanced Encryption Standard)  
**Key Size**: 256 bits  
**Mode**: GCM (Galois/Counter Mode)  
**Purpose**: Encrypt individual records and files

**Why AES-256-GCM**:
- Industry-standard, widely vetted
- Authenticated encryption (integrity + confidentiality)
- Efficient and hardware-accelerated
- Nonce-based (prevents replay attacks)

### 4.2 Data Encryption Process

1. **Generate DEK**: Random 32-byte key for each item
2. **Generate Nonce**: Random 12-byte nonce (IV) per encryption
3. **Encrypt**: AES-256-GCM encrypt data with DEK and nonce
4. **Extract Tag**: 16-byte authentication tag
5. **Store**: Ciphertext + nonce + tag (concatenated)

**Format**:
```
[Nonce (12 bytes)][Ciphertext (variable)][Tag (16 bytes)]
```

### 4.3 Data Decryption Process

1. **Extract Components**: Nonce, ciphertext, tag
2. **Decrypt**: AES-256-GCM decrypt with DEK
3. **Verify Tag**: Ensure integrity
4. **Return**: Plaintext if tag valid, error otherwise

---

## 5. Key Wrapping

### 5.1 DEK Wrapping

**Purpose**: Store DEKs securely (wrapped with KEK)

**Algorithm**: AES-256-GCM (same as data encryption)

**Process**:
1. Generate 12-byte nonce for wrapping
2. Encrypt DEK (32 bytes) with KEK using AES-256-GCM
3. Store: wrapped DEK + nonce + tag

**Storage Format**:
```
[Nonce (12 bytes)][Wrapped DEK (32 bytes)][Tag (16 bytes)]
```

### 5.2 Device Keys

**Purpose**: Enable multi-device access without sharing KEK directly

**Process**:
1. Generate device key (32 bytes) on device registration
2. Wrap device key with KEK (stored on server)
3. Device stores KEK (encrypted with device key) locally
4. On device, decrypt KEK with device key to access data

**Alternative (Simpler MVP)**:
- KEK derived on each device from password
- Device keys used only for device authentication/trust
- Each device derives KEK independently (no key sync needed)

---

## 6. Key Management

### 6.1 Key Storage

**KEK**: Never stored plaintext on server
- Derived on client from password + salt
- Salt stored in user record (server)

**DEK**: Stored wrapped (encrypted) on server
- Wrapped with KEK
- Stored in `data_keys` table

**Device Keys**: Stored wrapped on server
- Wrapped with KEK
- Used for device authentication

### 6.2 Key Rotation

**KEK Rotation**:
1. User generates new KEK (new password or rotation)
2. For each DEK:
   - Unwrap old DEK with old KEK (client-side)
   - Rewrap DEK with new KEK (client-side)
   - Update wrapped DEK in database
3. Update KEK version in user record
4. Old KEK discarded (client-side)

**Benefits**:
- No re-encryption of data needed
- Only key wrapping operations required
- Fast rotation process

**DEK Rotation** (future):
- Re-encrypt data with new DEK
- Update wrapped DEK
- Useful for compromised key scenarios

### 6.3 Key Recovery

**Recovery Codes**:
- 16-24 character codes (base32, uppercase, no ambiguous chars)
- 8-12 codes generated
- Hashed with Argon2id before storage
- User must store securely (one-time use recommended)

**Recovery Process** (future):
- Social recovery (multiple trusted contacts)
- Hardware keys (FIDO2/WebAuthn)
- Escrow service (encrypted with recovery key)

---

## 7. Authentication & Session Security

### 7.1 Password Hashing

**Algorithm**: Argon2id  
**Parameters**: Same as KEK derivation  
**Purpose**: Verify user password without storing plaintext

### 7.2 Token Generation

**Access Tokens**:
- Algorithm: HMAC-SHA256 (JWT)
- Expiry: 15 minutes
- Contains: user_id, device_id, jti (token ID), exp, iat

**Refresh Tokens**:
- Format: Cryptographically random 32-byte token
- Storage: Hashed (Argon2id) in database
- Expiry: 7 days
- Rotation: New token on each use

### 7.3 MFA (TOTP)

**Algorithm**: TOTP (RFC 6238)  
**Hash**: SHA-1  
**Digits**: 6  
**Period**: 30 seconds  
**Secret**: 160-bit (20 bytes), base32 encoded

**Storage**: Encrypted with user's KEK (not password hash)

---

## 8. Cryptographic Parameters Summary

| Purpose | Algorithm | Key Size | Notes |
|---------|-----------|----------|-------|
| KEK Derivation | Argon2id | 256 bits | Memory: 64MB, Time: 3, Parallel: 4 |
| Data Encryption | AES-256-GCM | 256 bits | Nonce: 12 bytes, Tag: 16 bytes |
| DEK Wrapping | AES-256-GCM | 256 bits | Same as data encryption |
| Password Hashing | Argon2id | 256 bits | Same parameters as KEK |
| Token Hashing | Argon2id | - | For refresh tokens |
| MFA | TOTP (SHA-1) | 160 bits | 6 digits, 30s period |
| JWT Signing | HMAC-SHA256 | 256 bits | For access tokens |

---

## 9. Client-Side Implementation

### 9.1 Browser (Web Crypto API)

**Key Generation**:
```typescript
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,  // extractable
  ['encrypt', 'decrypt']
);
```

**Encryption**:
```typescript
const iv = crypto.getRandomValues(new Uint8Array(12));
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: iv },
  key,
  data
);
```

### 9.2 Key Storage (Browser)

**Options**:
- SessionStorage: Cleared on browser close (more secure, less convenient)
- IndexedDB: Encrypted with user password (future)
- Secure key storage API (when available)

**MVP**: SessionStorage (keys lost on browser close, user re-enters password)

---

## 10. Security Considerations

### 10.1 Key Leakage

- KEK never transmitted to server
- DEKs transmitted only when wrapped
- Keys cleared from memory after use (where possible)

### 10.2 Side-Channel Attacks

- Constant-time operations where possible
- Avoid timing-dependent operations
- Use well-vetted libraries (Web Crypto API, Node.js crypto)

### 10.3 Key Compromise

- Key rotation capability
- Device revocation
- Audit logging of key operations
- Alert on suspicious key usage

### 10.4 Quantum Resistance

**Current**: Not quantum-resistant (AES, Argon2)  
**Future Consideration**: Post-quantum cryptography (PQCs) when standardized

---

## 11. Testing & Validation

### 11.1 Test Vectors

- Known plaintext/ciphertext pairs
- Key derivation test vectors (Argon2id)
- TOTP test vectors (RFC 6238)

### 11.2 Security Audits

- Cryptographic libraries (regular updates)
- Implementation review
- Penetration testing
- Third-party security audits

---

## 12. Compliance & Standards

- **NIST**: SP 800-38D (GCM), SP 800-63B (Authentication)
- **RFC 6238**: TOTP
- **OWASP**: Cryptographic Storage Cheat Sheet
- **GDPR**: Encryption as appropriate technical measure

---

## 13. References

- Argon2: https://github.com/P-H-C/phc-winner-argon2
- AES-GCM: NIST SP 800-38D
- TOTP: RFC 6238
- Web Crypto API: https://www.w3.org/TR/WebCryptoAPI/
- Node.js Crypto: https://nodejs.org/api/crypto.html


