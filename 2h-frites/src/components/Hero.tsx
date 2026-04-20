'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import { useTenant } from '@/contexts/TenantContext';

export default function Hero() {
  const { t } = useLanguage();
  const { tenant } = useTenant();

  const displayName = tenant?.branding?.brandName || tenant?.name || '';
  const tagline = tenant?.branding?.tagline || t.ui.slogan;

  return (
    <section className="text-center py-10 px-4">
      <div className="mb-3">
        {tenant?.branding?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenant.branding.logoUrl} alt={displayName || 'Restaurant'} className="h-20 w-auto mx-auto object-contain" />
        ) : displayName ? (
          <h1 className="text-[32px] font-extrabold text-[#1A1A1A] tracking-[-0.02em] leading-tight">{displayName}</h1>
        ) : null}
      </div>
      {tagline && (
        <p className="text-[#6B6B6B] text-[14px] mt-2 max-w-xs mx-auto leading-relaxed">{tagline}</p>
      )}
    </section>
  );
}
