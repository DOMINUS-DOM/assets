'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { menuStore } from '@/stores/menuStore';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatPrice } from '@/utils/format';

interface ContentItem {
  content: {
    type: string;
    name: string;
    duration: number;
    configJson: string;
  };
  durationOverride: number | null;
}

interface PlayerData {
  screen: { name: string; orientation: string; resolution: string };
  playlist: { name: string; items: ContentItem[] } | null;
  error?: string;
}

// ─── Content Renderers ───

function MenuContent({ config }: { config: any }) {
  const { getCategory, getItemName } = useLanguage();
  const categories = menuStore.getCategories();
  const selectedCats = config.categories || [];
  const filtered = categories.filter((c) => selectedCats.includes(c.id));

  return (
    <div className="h-full flex flex-col p-8">
      {filtered.map((cat) => (
        <div key={cat.id} className="mb-6">
          <h2 className="text-2xl font-extrabold text-amber-400 mb-3 flex items-center gap-2">
            <span className="text-3xl">{cat.icon}</span> {getCategory(cat.nameKey)}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {cat.items.filter((i) => !i.unavailable).slice(0, 12).map((item) => (
              <div key={item.id} className="flex justify-between items-center px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800/50">
                <span className="text-sm font-medium text-white truncate">{getItemName(item.id, item.name)}</span>
                {item.price != null && (
                  <span className="text-sm font-bold text-amber-400 ml-2 shrink-0">{formatPrice(item.price)} &euro;</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TextContent({ config }: { config: any }) {
  const fontSize = config.fontSize || 48;
  const bgColor = config.bgColor || '#09090b';
  const textColor = config.textColor || '#fbbf24';

  return (
    <div className="h-full flex items-center justify-center p-12" style={{ backgroundColor: bgColor }}>
      <p className="font-extrabold text-center leading-tight whitespace-pre-wrap" style={{ fontSize: `${fontSize}px`, color: textColor }}>
        {config.text || ''}
      </p>
    </div>
  );
}

function ImageContent({ config }: { config: any }) {
  return (
    <div className="h-full flex items-center justify-center bg-black">
      {config.mediaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={config.mediaUrl} alt="" className="max-h-full max-w-full object-contain" />
      ) : (
        <p className="text-zinc-500 text-xl">Aucune image configuree</p>
      )}
    </div>
  );
}

function VideoContent({ config }: { config: any }) {
  return (
    <div className="h-full flex items-center justify-center bg-black">
      {config.mediaUrl ? (
        <video src={config.mediaUrl} autoPlay muted loop className="max-h-full max-w-full object-contain" />
      ) : (
        <p className="text-zinc-500 text-xl">Aucune video configuree</p>
      )}
    </div>
  );
}

// ─── Standby Screen ───

function StandbyScreen({ screenName }: { screenName?: string }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-zinc-950">
      <span className="text-8xl mb-6">&#127839;</span>
      <h1 className="text-4xl font-extrabold text-white mb-2">
        <span className="text-amber-400">2H</span> Frites Artisanales
      </h1>
      {screenName && <p className="text-zinc-500 text-sm mb-8">{screenName}</p>}
      <p className="text-6xl font-bold text-amber-400 tabular-nums">
        {time.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-zinc-600 text-sm mt-4">
        {time.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

// ─── Header Bar ───

function HeaderBar() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-2 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="text-2xl">&#127839;</span>
        <h1 className="text-lg font-extrabold">
          <span className="text-amber-400">2H</span> <span className="text-white">Frites</span>
        </h1>
      </div>
      <p className="text-xl font-bold text-amber-400 tabular-nums">
        {time.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}

// ─── Bottom Promo Bar ───

function PromoBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center px-6 py-2 bg-amber-500 text-black">
      <p className="text-sm font-bold tracking-wide">
        Commandez sur 2hfrites.be
      </p>
    </div>
  );
}

// ─── Player ───

export default function SignagePlayer() {
  const params = useParams();
  const code = params.code as string;
  const [data, setData] = useState<PlayerData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const nextIndexRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/signage/player?code=${code}`);
      const json = await res.json();
      if (json.error) {
        setError(true);
        return;
      }
      setData(json);
      setError(false);
    } catch {
      setError(true);
    }
  }, [code]);

  // Initial load + polling every 10s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Content rotation with fade transition
  useEffect(() => {
    if (!data?.playlist?.items?.length) return;

    const items = data.playlist.items;
    const currentItem = items[currentIndex];
    if (!currentItem) { setCurrentIndex(0); return; }

    const duration = (currentItem.durationOverride || currentItem.content.duration) * 1000;
    const timer = setTimeout(() => {
      const nextIdx = (currentIndex + 1) % items.length;
      nextIndexRef.current = nextIdx;
      // Start fade out
      setTransitioning(true);
      // After fade out completes, switch content and fade in
      setTimeout(() => {
        setCurrentIndex(nextIdx);
        setTransitioning(false);
      }, 500);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, data]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl block mb-4">&#128250;</span>
          <h1 className="text-2xl font-bold text-white mb-2">Ecran non trouve</h1>
          <p className="text-zinc-500 text-sm">Code : {code}</p>
          <p className="text-zinc-600 text-xs mt-4">Verifiez le code ou contactez l&apos;administrateur</p>
        </div>
      </div>
    );
  }

  // Loading
  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <span className="text-6xl animate-pulse">&#127839;</span>
      </div>
    );
  }

  // No playlist -> standby
  if (!data.playlist || !data.playlist.items.length) {
    return (
      <div className="min-h-screen">
        <StandbyScreen screenName={data.screen.name} />
      </div>
    );
  }

  // Render current content
  const items = data.playlist.items;
  const currentItem = items[currentIndex % items.length];
  if (!currentItem) return <StandbyScreen screenName={data.screen.name} />;

  let config: any = {};
  try {
    config = JSON.parse(currentItem.content.configJson);
  } catch {}

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header bar */}
      <HeaderBar />

      {/* Content area with fade transition */}
      <div
        className="pt-12 pb-12"
        style={{
          minHeight: '100vh',
          opacity: transitioning ? 0 : 1,
          transition: 'opacity 500ms ease-in-out',
        }}
      >
        {currentItem.content.type === 'menu' && <MenuContent config={config} />}
        {currentItem.content.type === 'text' && <TextContent config={config} />}
        {currentItem.content.type === 'image' && <ImageContent config={config} />}
        {currentItem.content.type === 'video' && <VideoContent config={config} />}
      </div>

      {/* Bottom promo bar */}
      <PromoBar />

      {/* Progress indicator (above promo bar) */}
      <div className="fixed bottom-9 left-0 right-0 h-1 bg-zinc-800 z-50">
        <div className="h-full bg-amber-500/50 transition-all duration-1000" style={{
          width: `${((currentIndex + 1) / items.length) * 100}%`,
        }} />
      </div>
    </div>
  );
}
