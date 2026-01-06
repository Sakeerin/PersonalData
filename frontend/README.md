# Personal Data Vault - Frontend

Next.js frontend application for the Personal Data Vault system.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Features

- **Onboarding**: User registration with recovery codes
- **Dashboard**: Overview of vault contents
- **Records**: Create, view, edit, delete structured records
- **Files**: Upload, download, manage encrypted files
- **Sharing**: Manage shares and permissions
- **Devices**: View and manage trusted devices
- **Alerts**: View and manage security alerts
- **Audit**: View audit logs and export
- **DSR**: Data Subject Rights workflows (export, delete account)
- **Settings**: Security checklist, MFA setup

## Client-Side Encryption

All sensitive data is encrypted client-side before being sent to the server using Web Crypto API.

## Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:3000)
- `NEXT_PUBLIC_APP_URL`: Frontend app URL (default: http://localhost:3001)

