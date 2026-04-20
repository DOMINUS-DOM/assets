'use client';

import { useEffect } from 'react';
import { useTenant } from './TenantContext';

/**
 * Injects CSS custom properties from the tenant's branding config.
 * Values are set as "R G B" channels so Tailwind can compose opacity.
 * Falls back to defaults in globals.css if no branding is set.
 */
export function TenantThemeProvider({ children }: { children: React.ReactNode }) {
  const { tenant } = useTenant();

  useEffect(() => {
    if (!tenant?.branding) return;
    const b = tenant.branding;
    const root = document.documentElement;

    if (b.primaryColor) {
      root.style.setProperty('--brand', hexToRgbChannels(b.primaryColor));
      root.style.setProperty('--brand-light', hexToRgbChannels(b.primaryLight || lighten(b.primaryColor)));
      root.style.setProperty('--brand-dark', hexToRgbChannels(b.primaryDark || darken(b.primaryColor)));
    }

    return () => {
      root.style.removeProperty('--brand');
      root.style.removeProperty('--brand-light');
      root.style.removeProperty('--brand-dark');
    };
  }, [tenant?.branding]);

  return <>{children}</>;
}

// ─── Color utils ───

/** "#3b82f6" → "59 130 246" */
function hexToRgbChannels(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

function lighten(hex: string): string {
  return adjustBrightness(hex, 30);
}

function darken(hex: string): string {
  return adjustBrightness(hex, -25);
}

function adjustBrightness(hex: string, amount: number): string {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
