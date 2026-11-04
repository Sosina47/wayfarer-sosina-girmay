import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import { assertTestDatabase } from './tests/helpers/assertTestDatabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server environment
dotenv.config({ path: path.join(__dirname, '.env') });

const testUrl = process.env.TEST_DATABASE_URL;
const devUrl = process.env.DATABASE_URL;

// Guard check at test configuration time (fail fast before any connection)
assertTestDatabase(testUrl, devUrl);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/globalSetup.ts'],
    fileParallelism: false, // Database-backed test files run serially
    env: {
      DATABASE_URL: testUrl!,
      TEST_DATABASE_URL: testUrl!,
      DEV_DATABASE_URL: devUrl!
    }
  }
});
