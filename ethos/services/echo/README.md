# Ethos Echo service

The service to listen to events from Ethos smart contracts and replicating them
in RDS.

## Development

### DB migrations

Once you modified the `services/echo/prisma/schema.prisma`, you need to create a
migration. To do this:

1. First, navigate to the Echo service directory `cd services/echo`.
1. Run `npx prisma migrate dev --name <migration-name>`. This will create the
   migration file and run it for you.

### Access Postgres locally

You can use any GUI or CLI to access the RDS. My recommendation is
[Postico2](https://eggerapps.at/postico2/) if you are on MacOS. The username and
password are `postgres`. The full connection URL is `postgres://postgres:postgres@localhost:5432/ethos`.

## Architecture

```mermaid
sequenceDiagram
  Note over Client: Sends HTTP request
  Client->>Express endpoint: HTTP request

  Express endpoint->>Controller: HTTP request

  Note over Service: Have no idea about upper layers (Controller)
  Note over Prisma: Have no idea about upper layers (Controller, Service)

  Note over Controller: Extracts data from request and passes to the service
  Controller->>Service: JS object

  Note over Service: Validates input, executes business-logic
  Note over Service: May query DB for any data
  Service->>Prisma: Query

  Note over Prisma: Knows how to extract requested data from DB
  Prisma->>Service: Query result

  Note over Service: May interact with Blockchain
  Service->>Blockchain: Request
  Blockchain->>Service: Response

  Note over Service: May interact with other APIs
  Service->>1st/3rd-party APIs: Request
  1st/3rd-party APIs->>Service: Response

  Service->>Controller: JS object
  Note over Controller: Knows how to send this\ndata in response

  Controller->>Client: HTTP response
```

## DB Connectivity

The DB is a Postgres instance managed by GCP Cloud SQL. When not running locally, connections are secured with SSL client certificates.

### Dev DB

In order to connect to the Dev environment DB from a local machine, you will need to use the client certificate and keys, and the server CA certificate. They are stored in 1password.

- `client-cert.pem`
- `client-key.pem`
- `server-ca.pem`

### Examples

You can configure your local postgres client accordingly; this is an example for CLI `psql`:

```bash
psql "sslmode=verify-ca sslrootcert=server-ca.pem sslcert=client-cert.pem sslkey=client-key.pem hostaddr=34.31.16.222 port=5432 user=ethos-echo dbname=ethos"
```

This is an example of a Prisma connection string:

```bash
DATABASE_URL="postgresql://ethos-echo:<password>@34.31.16.222:5432/ethos?sslmode=require&connection_limit=40&sslcert=/var/run/shm/ssl/ca.pem&sslidentity=/var/run/shm/ssl/client-identity.p12"
```

However, note that prisma expect the client identity to be a single file in PKCS12 format, not the client certificate and key separately. To generate the PKCS12 file, you can use the following command:

```bash
openssl pkcs12 -export -out client-identity.p12 -inkey client-key.pem -in client-cert.pem -passout pass:
```

### Deploying DB Connection Secrets

The client SSL certificates are deployed as secrets in fly.io.
Because they contain newlines, it's recommended to use `flyctl secrets set SECRET=- <FILE` to set the secret.
This is an "undocumented feature" of flyctl; see https://community.fly.io/t/how-are-you-managing-cert-files-with-fly/2984/12

```bash
flyctl secrets set --app trust-ethos-echo-dev --stage DB_SERVER_CA=- < server-ca.pem
flyctl secrets set --app trust-ethos-echo-dev --stage DB_SSL_CERT=- < client-cert.pem
flyctl secrets set --app trust-ethos-echo-dev --stage DB_SSL_KEY=- < client-key.pem
```

If you really want to simulate what is happening on production locally, you can export the following environment variables and run the `npm run prestart:production` option.

```bash
export DB_SERVER_CA=$(echo -e "$(cat server-ca.pem)")
export DB_SSL_CERT=$(echo -e "$(cat client-cert.pem)")
export DB_SSL_KEY=$(echo -e "$(cat client-key.pem)")
npm run prestart:production
```
