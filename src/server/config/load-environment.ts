import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

let environmentLoaded = false;

/**
 * Next.js reads a root .env automatically. During the migration from the old
 * split frontend/backend layout, existing installations may still keep their
 * server secrets in backend/.env. Load that legacy file only as a fallback so
 * an absent root .env never silently connects to the default local database.
 */
export function loadServerEnvironment(): void {
  if (environmentLoaded) return;

  const rootEnvPath = path.resolve(process.cwd(), '.env');
  const legacyBackendEnvPath = path.resolve(process.cwd(), 'backend', '.env');

  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
  }

  if (fs.existsSync(legacyBackendEnvPath)) {
    dotenv.config({ path: legacyBackendEnvPath, override: false });
  }

  environmentLoaded = true;
}

loadServerEnvironment();
