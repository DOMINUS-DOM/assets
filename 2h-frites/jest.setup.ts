/**
 * Jest bootstrap — loads env files and forces the test DB.
 *
 * Runs BEFORE every test module evaluates, courtesy of
 * `setupFiles: ['<rootDir>/jest.setup.ts']` in jest.config.js. Because it
 * runs before any import, it can safely rewrite process.env before
 * src/lib/env.ts evaluates its zod schema.
 *
 * Boot sequence:
 *   1. Load .env.local (dev secrets, gitignored) then .env (shared).
 *      dotenv does NOT override existing vars by default, matching
 *      Next.js precedence.
 *   2. Require DATABASE_URL_TEST — no test can run without it.
 *   3. Force DATABASE_URL := DATABASE_URL_TEST (allowlist guard in
 *      src/lib/env.ts then rejects any other value).
 *   4. Force NODE_ENV=test (jest does this itself but explicit ≠ fragile).
 *   5. Fill in non-critical defaults for vars jest doesn't need real
 *      values for (CRON_SECRET, APP_DOMAIN, etc.) — won't clobber if
 *      set in .env*.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

if (!process.env.DATABASE_URL_TEST) {
  throw new Error(
    'DATABASE_URL_TEST required. Configure Neon test branch first ' +
      '(see NOTES_AUDIT.md § "DB de test — Neon branch test").'
  );
}

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
// NODE_ENV is typed readonly in @types/node via Next.js narrowing.
// Indexed assignment bypasses the narrowing — the value is still writable.
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';

// Non-critical defaults — leave alone if real values already present
process.env.APP_DOMAIN ||= 'localhost:3000';
process.env.NEXT_PUBLIC_APP_DOMAIN ||= 'localhost:3000';
process.env.CRON_SECRET ||= 'test-cron-secret-at-least-16-chars';
process.env.KIOSK_API_KEY ||= 'test-kiosk-key-at-least-16-chars';
