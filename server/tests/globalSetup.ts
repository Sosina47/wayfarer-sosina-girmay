import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { assertTestDatabase } from './helpers/assertTestDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, '..');

export default async function globalSetup() {
  // Load original environment from .env
  dotenv.config({ path: path.join(serverDir, '.env') });

  const testDbUrl = process.env.TEST_DATABASE_URL;
  const devDbUrl = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;

  // Strict guard check before running migrations on test database
  assertTestDatabase(testDbUrl, devDbUrl);

  console.log('[GlobalSetup] Deploying migrations to test database...');
  try {
    execSync('npx prisma migrate deploy', {
      cwd: serverDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: testDbUrl
      }
    });
    console.log('[GlobalSetup] Test database migrated successfully.');
  } catch (err) {
    console.error('[GlobalSetup] Failed to deploy migrations to test database:', err);
    throw err;
  }
}
