# Database Bootstrap Script

Often it takes too long to process all existing blockchain events when starting the local Ethos development environment. This script bootstraps the local database with data from the remote development database.

This script automates the process of exporting the development database, stopping local Docker containers, and bootstrapping a local database with the exported data.

## Prerequisites

Before running the script, ensure you have the following:

1. Docker installed and running
2. OpenSSL

## Configuration

### SSL Certificates

These are available in 1password. Place the following SSL certificates in the `~/certs/dev/` directory:

- `client-cert.pem`
- `client-key.pem`
- `server-ca.pem`

### Environment Variables

Set the following environment variable:

- `PG_ETHOS_DEV_PASSWORD`: PostgreSQL password (can be found in 1Password)

If not set, the script will prompt you to enter it.

## Usage

Run the script from the root of the Ethos project.

```bash
npm run db:bootstrap
```

To continue to run the local Ethos services, run:

```bash
npm run start
```
