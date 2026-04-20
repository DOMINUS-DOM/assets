'use client';

import { useModule, TenantModules } from '@/contexts/TenantContext';

interface FeatureGateProps {
  module: keyof TenantModules;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditionally renders children only if the specified module is enabled for the current tenant.
 * If module is disabled, renders fallback (default: nothing).
 * If tenant is not loaded yet, renders children (permissive by default).
 */
export default function FeatureGate({ module, children, fallback = null }: FeatureGateProps) {
  const enabled = useModule(module);
  return enabled ? <>{children}</> : <>{fallback}</>;
}

/**
 * Full-page gate: shows a "feature disabled" message instead of the page content.
 */
export function FeatureDisabledPage({ module }: { module: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-center p-8">
        <p className="text-4xl mb-4">🔒</p>
        <h1 className="text-xl font-bold text-white mb-2">Module non disponible</h1>
        <p className="text-zinc-400 text-sm">
          Le module <span className="text-brand-light font-medium">{module}</span> n&apos;est pas activ&eacute; pour votre &eacute;tablissement.
        </p>
      </div>
    </div>
  );
}
