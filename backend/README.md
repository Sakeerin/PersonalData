# Personal Data Vault - Backend

Backend API for the Personal Data Vault system.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- npm >= 9.0.0

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Seed default templates (optional)
npm run db:seed
```

### Development

```bash
# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

See `.env.example` for required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT signing (min 32 bytes)
- `JWT_REFRESH_SECRET`: Secret for refresh tokens (min 32 bytes)
- `FILE_STORAGE_PATH`: Path for file storage (default: ./storage/files)
- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging level (error/warn/info/debug)

## API Documentation

See `docs/API.md` for complete API documentation.

## Architecture

- **Monolith**: Modular structure, ready for microservices extraction
- **Database**: PostgreSQL with JSONB support
- **Encryption**: E2EE - all data encrypted client-side
- **Authentication**: JWT with refresh tokens, MFA support
- **Audit**: Comprehensive append-only audit logging

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Database Migrations

```bash
# Run migrations
npm run db:migrate

# Create new migration
# (manually create file in src/db/migrations/)
```

## Security

- All sensitive data encrypted client-side (E2EE)
- Rate limiting on all endpoints
- Input validation
- SQL injection protection (parameterized queries)
- CORS and security headers (Helmet)

