// Lightweight error reporting — replace with real Sentry SDK for production
// npm install @sentry/nextjs && configure DSN in .env

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

interface ErrorReport {
  message: string;
  stack?: string;
  url?: string;
  timestamp: string;
  extra?: Record<string, unknown>;
}

const errorLog: ErrorReport[] = [];

export function captureException(error: unknown, extra?: Record<string, unknown>) {
  const err = error instanceof Error ? error : new Error(String(error));
  const report: ErrorReport = {
    message: err.message,
    stack: err.stack,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    timestamp: new Date().toISOString(),
    extra,
  };

  errorLog.push(report);

  // Log to console in dev
  if (process.env.NODE_ENV === 'development') {
    console.error('[Sentry]', report);
  }

  // Send to Sentry if DSN is configured
  if (SENTRY_DSN) {
    fetch(SENTRY_DSN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    }).catch(() => {});
  }
}

export function getErrorLog() {
  return [...errorLog];
}

// Global error handler
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    captureException(event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason || 'Unhandled promise rejection');
  });
}
