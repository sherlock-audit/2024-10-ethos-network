/* eslint-disable no-console */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { type ZodString, type ZodOptional } from 'zod';
import { config, dbConfig } from './common/config.js';

/**
 * Prisma SSL config
 * see: https://www.prisma.io/docs/orm/overview/databases/postgresql#configuring-an-ssl-connection
 * Prisma expects *files* but we pass the PEM strings as secrets in Fly.io
 * Coalesce the secrets into files and pass the paths to Prisma
 *
 * These functions must be run after config is loaded but before prisma connections are established.
 *
 * Note: all functions are idempotent; you will not overwrite files. However, we use the shared
 * memory filesystem /var/run/shm/ to store the SSL files which will be lost on reboot.
 */

const SSL_DIR = '/var/run/shm/ssl';
const SSL_FILES = {
  ca: 'ca.pem',
  cert: 'client-cert.pem',
  key: 'client-key.pem',
  p12: 'client-identity.p12',
};

// Create a directory to store SSL files
function createSslDirectory(): string {
  if (!fs.existsSync(SSL_DIR)) {
    fs.mkdirSync(SSL_DIR, { recursive: true });
  }

  return SSL_DIR;
}

// convert the fly secrets into files
function saveSslFile(
  content: ZodOptional<ZodString>,
  fileName: string,
  configName: string,
): string {
  if (!content || typeof content !== 'string') {
    throw new Error(`Bootstrap DB SSL: ${configName} is required`);
  }
  const filePath = path.join(SSL_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
  }

  return filePath;
}

function saveSslFiles(): { caPath: string; certPath: string; keyPath: string } {
  const caPath = saveSslFile(dbConfig.DB_SERVER_CA, SSL_FILES.ca, 'DB_SERVER_CA');
  const certPath = saveSslFile(dbConfig.DB_SSL_CERT, SSL_FILES.cert, 'DB_SSL_CERT');
  const keyPath = saveSslFile(dbConfig.DB_SSL_KEY, SSL_FILES.key, 'DB_SSL_KEY');

  return { caPath, certPath, keyPath };
}

// generate a PKCS12 file from the client key and certificate
function generatePkcs12File(
  sslDir: string,
  keyPath: string,
  certPath: string,
): { p12Path: string } {
  const p12Path = path.join(sslDir, SSL_FILES.p12);

  if (!fs.existsSync(p12Path)) {
    try {
      execSync(
        `openssl pkcs12 -export -out ${p12Path} -inkey ${keyPath} -in ${certPath} -passout pass:`,
      );
      console.info(`Bootstrap DB SSL: PKCS12 file generated at ${p12Path}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Bootstrap DB SSL: Error generating PKCS12 file: ${errorMessage}`);
      throw new Error(
        'Unable to establish DB SSL connection; check that DB_SSL_KEY and DB_SSL_CERT are valid PEM files.',
      );
    }
  }

  return { p12Path };
}

// ensure the environment variable matches the configuration we're using
function verifyPrismaUrl(caPath: string, p12Path: string): void {
  const sslParams = new URLSearchParams({
    sslmode: 'require',
    sslcert: caPath,
    sslidentity: p12Path,
  });

  const dbParams = sslParams.toString();

  if (config.DATABASE_URL.includes(dbParams)) {
    const configParams = new URL(config.DATABASE_URL).search.toString();
    console.error(
      `Bootstrap DB SSL: DATABASE_URL (${configParams}) does not match the SSL configuration (${dbParams})`,
    );
  }
}

// Ensure the SSL prerequisites are met before initializing Prisma Client
export function bootstrapDbSSL(): void {
  const sslDir = createSslDirectory();
  const { caPath, certPath, keyPath } = saveSslFiles();
  const { p12Path } = generatePkcs12File(sslDir, keyPath, certPath);
  verifyPrismaUrl(caPath, p12Path);
}

// Run bootstrapDbSSL only if this file is being run directly
if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  bootstrapDbSSL();
}
