/**
 * Environment variable validator.
 *
 * Parses and validates process.env at boot via zod. Fails hard with a
 * readable error message if required variables are missing or malformed.
 *
 * Usage:
 *   import { env } from '@/lib/env';
 *   const key = env.STRIPE_SECRET_KEY;
 *
 * RULES:
 *  - Server-only code: use `env.X`.
 *  - Client components: keep `process.env.NEXT_PUBLIC_X` (Next.js inlines
 *    these at compile time; `env` from this module is not available in
 *    the client bundle). NEXT_PUBLIC_* are still validated here at server
 *    boot so missing values fail fast on the server side.
 *
 * This module has a top-level side effect: it throws if validation fails.
 * Import it first in the app entry (src/app/layout.tsx) so boot fails
 * before anything else reads process.env.
 */
import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // ── Required everywhere ──────────────────────────────────────────
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
    AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
    CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),
    KIOSK_API_KEY: z.string().min(16, 'KIOSK_API_KEY must be at least 16 characters'),
    APP_DOMAIN: z.string().min(1, 'APP_DOMAIN is required'),
    NEXT_PUBLIC_APP_DOMAIN: z.string().min(1, 'NEXT_PUBLIC_APP_DOMAIN is required'),

    // ── Required in production, optional in dev (enforced below) ─────
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_BASE: z.string().optional(),
    STRIPE_PRICE_WEB: z.string().optional(),
    STRIPE_PRICE_KIOSK: z.string().optional(),
    STRIPE_PRICE_KDS: z.string().optional(),
    STRIPE_PRICE_ANALYTICS: z.string().optional(),
    STRIPE_PRICE_MULTIUSERS: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    BRIZO_SUPPORT_EMAIL: z.string().email('BRIZO_SUPPORT_EMAIL must be a valid email').optional(),
    BRIZO_LEGAL_ADDRESS: z.string().optional(),

    // ── Always optional ──────────────────────────────────────────────
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_DEMO_VIDEO_URL: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),

    // ── Test DB isolation ────────────────────────────────────────────
    // URL of the Neon `test` branch. Never required, only used by
    // jest.setup.ts to swap DATABASE_URL before tests run.
    DATABASE_URL_TEST: z.string().url('DATABASE_URL_TEST must be a valid URL').optional(),
  })
  .superRefine((val, ctx) => {
    // Anti-catastrophe guard: in NODE_ENV=test, DATABASE_URL must equal
    // DATABASE_URL_TEST. Allowlist approach — any DB that isn't the
    // explicitly-designated test branch is rejected, so adding a new
    // prod env in the future can't accidentally pass.
    if (val.NODE_ENV !== 'test') return;
    if (!val.DATABASE_URL_TEST) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL_TEST'],
        message:
          'DATABASE_URL_TEST required when NODE_ENV=test. ' +
          'Configure Neon test branch and set the env var.',
      });
      return;
    }
    if (val.DATABASE_URL !== val.DATABASE_URL_TEST) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          'In NODE_ENV=test, DATABASE_URL must equal DATABASE_URL_TEST. ' +
          'jest.setup.ts should perform this swap before env.ts evaluates.',
      });
    }
  })
  .superRefine((val, ctx) => {
    if (val.NODE_ENV !== 'production') return;
    const prodRequired = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PRICE_BASE',
      'STRIPE_PRICE_WEB',
      'STRIPE_PRICE_KIOSK',
      'STRIPE_PRICE_KDS',
      'STRIPE_PRICE_ANALYTICS',
      'STRIPE_PRICE_MULTIUSERS',
      'RESEND_API_KEY',
      'BRIZO_SUPPORT_EMAIL',
      'BRIZO_LEGAL_ADDRESS',
    ] as const;
    for (const key of prodRequired) {
      if (!val[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required in production`,
        });
      }
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  throw new Error(`Environment validation failed:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;
