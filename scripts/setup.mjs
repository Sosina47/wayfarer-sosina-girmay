#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const envExample = path.join(serverDir, '.env.example');
const envTarget = path.join(serverDir, '.env');

console.log('[Setup] Initializing Wayfarer environment...');

// 1. Ensure server/.env exists
if (!fs.existsSync(envTarget)) {
  if (fs.existsSync(envExample)) {
    console.log('[Setup] Creating server/.env from server/.env.example...');
    fs.copyFileSync(envExample, envTarget);
    console.log('[Setup] NOTICE: Please update server/.env with your local PostgreSQL password if needed.');
  } else {
    console.warn('[Setup] Warning: server/.env.example not found.');
  }
} else {
  console.log('[Setup] server/.env already exists.');
}

// 2. Generate Prisma Client
console.log('[Setup] Generating Prisma client...');
try {
  execSync('npm run db:generate -w server', { stdio: 'inherit', cwd: rootDir });
  console.log('[Setup] Prisma client generated successfully.');
} catch (error) {
  console.error('[Setup] Failed to generate Prisma client. Make sure dependencies are installed.', error);
  process.exit(1);
}

console.log('[Setup] Setup completed successfully.');

