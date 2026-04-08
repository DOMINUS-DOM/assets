'use client';

import { useState, useEffect } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-amber-500 text-zinc-950
        shadow-lg shadow-amber-500/25 flex items-center justify-center text-xl font-bold
        active:scale-90 transition-transform animate-scale-in"
      aria-label="Back to top"
    >
      ↑
    </button>
  );
}
