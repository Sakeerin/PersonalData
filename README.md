# Personal Data Vault

End-to-end encrypted personal data vault with comprehensive security, access control, audit logging, and Data Subject Rights (DSR) compliance.

## Features

- 🔐 **End-to-End Encryption (E2EE)**: Zero-knowledge architecture - server cannot read your data
- 🔑 **Key Management**: User-controlled keys with multi-device support and recovery options
- 👥 **Access Control**: Fine-grained sharing with time-bound access, field-level permissions, and consent management
- 📋 **Audit Logging**: Comprehensive append-only audit logs for all security-relevant events
- 🚨 **Risk Alerting**: Real-time alerts for anomalous activities and security incidents
- ✅ **DSR Compliance**: Full support for Data Subject Rights (access, portability, erasure, consent withdrawal)
- 🔒 **MFA & Device Management**: TOTP-based MFA, device registration, and session management

## Architecture

- **Backend**: Node.js + TypeScript (Express)
- **Frontend**: Next.js + React + TypeScript
- **Database**: PostgreSQL (with JSONB support)
- **Encryption**: AES-256-GCM with Argon2id key derivation

## Project Structure

```
.
├── backend/          # Backend API (Node.js/TypeScript)
├── frontend/         # Frontend UI (Next.js/React)
├── docs/            # Documentation
└── package.json     # Root package configuration
```

## Documentation

- [Software Requirements Specification (SRS)](docs/SRS.md)
- [Architecture Documentation](docs/ARCH.md)
- [Threat Model](docs/THREAT_MODEL.md)
- [Cryptographic Specification](docs/CRYPTO_SPEC.md)
- [API Documentation](docs/API.md)
- [Operations Runbook](docs/RUNBOOK.md)

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14.0

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Setup database
cd backend
npm run db:migrate

# Start development servers
npm run dev
```

### Development

```bash
# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend

# Run tests
npm test

# Lint code
npm run lint
```

## Security

This system implements End-to-End Encryption (E2EE). The server cannot decrypt your data without your keys. Always:

1. Use strong, unique passwords
2. Enable MFA
3. Save your recovery codes securely
4. Regularly review active sessions and devices
5. Monitor audit logs for suspicious activity

## License

[Specify your license here]

## Contributing

[Specify contribution guidelines here]


