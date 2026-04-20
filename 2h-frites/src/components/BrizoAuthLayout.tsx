'use client';

export default function BrizoAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left — editorial panel */}
      <div className="hidden lg:flex lg:w-[44%] bg-[#F5F3EF] items-center justify-center relative overflow-hidden">
        {/* Decorative line */}
        <div className="absolute top-0 right-0 w-px h-full bg-[#D4D0C8]/60" />

        <div className="relative px-14 max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brizo-icon.svg" alt="" className="h-10 w-10 mb-10 opacity-80" />
          <p className="text-[11px] font-medium tracking-[0.25em] uppercase text-[#7C3AED] mb-6">BrizoApp</p>
          <h2 className="text-[2rem] font-bold text-[#1A1A1A] tracking-tight leading-[1.2] mb-6">
            Chaque restaurant
            <br />
            merite la technologie
            <br />
            <span className="text-[#B0ADA6]">des grands.</span>
          </h2>
          <div className="h-px w-12 bg-[#D4D0C8] mb-6" />
          <p className="text-[14px] text-[#8A8A8A] leading-[1.7]">
            Caisse, commande en ligne, kiosk, cuisine. Tout est pret, sans installation.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 bg-white flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
