import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env or root .env
const serverEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

dotenv.config({ path: serverEnvPath });
dotenv.config({ path: rootEnvPath });

export interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  TEST_DATABASE_URL?: string;
  NODE_ENV: string;
}

export function validateEnv(): EnvConfig {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is missing. Please create server/.env from server/.env.example.'
    );
  }

  const PORT = Number(process.env.PORT) || 3001;
  const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
  const NODE_ENV = process.env.NODE_ENV || 'development';

  return {
    PORT,
    DATABASE_URL,
    TEST_DATABASE_URL,
    NODE_ENV
  };
}

export const env = validateEnv();

