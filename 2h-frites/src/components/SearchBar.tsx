'use client';

import { useLanguage } from '@/i18n/LanguageContext';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const { t } = useLanguage();

  return (
    <div className="relative px-4 mb-6">
      <div className="relative">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8A8A8A]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t.ui.search}
          className="w-full pl-11 pr-10 py-3.5 rounded-xl bg-white border border-[#EDEBE7]
            text-[#1A1A1A] placeholder-[#B0ADA6] text-sm focus:outline-none focus:border-[#1A1A1A]/30
            transition-colors"
          aria-label={t.ui.search}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center
              rounded-full bg-[#F5F3EF] text-[#8A8A8A] hover:text-[#1A1A1A] transition-colors text-sm"
            aria-label={t.ui.clearSearch}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
