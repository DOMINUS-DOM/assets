'use client';

import { useState } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { useLanguage } from '@/i18n/LanguageContext';

export default function QRCodePage() {
  const { t } = useLanguage();
  const { locationId, locationName } = useLocation();
  const [tableCount, setTableCount] = useState(10);
  const [showKiosk, setShowKiosk] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.2hfrites.be';

  // URLs to generate QR codes for
  const urls = [
    { label: 'Menu en ligne', url: baseUrl, icon: '📱', desc: 'Commande en ligne (retrait/livraison)' },
    { label: 'Borne kiosk', url: `${baseUrl}/kiosk`, icon: '🖥️', desc: 'Borne libre-service sur place' },
    ...(showKiosk ? Array.from({ length: tableCount }, (_, i) => ({
      label: `Table ${i + 1}`,
      url: `${baseUrl}/kiosk?table=${i + 1}`,
      icon: '🍽️',
      desc: `Commander depuis la table ${i + 1}`,
    })) : []),
  ];

  // Use a free QR code API
  const getQRUrl = (text: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}&bgcolor=09090b&color=f59e0b`;

  const handlePrint = () => {
    window.print();
  };

  const ic = 'w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-amber-500/50';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">QR Codes</h1>
          <p className="text-xs text-zinc-500 mt-1">Generez des QR codes pour vos clients</p>
        </div>
        <button onClick={handlePrint}
          className="px-4 py-2 rounded-lg bg-amber-500 text-zinc-950 text-sm font-bold hover:bg-amber-400 transition-colors print:hidden">
          🖨️ Imprimer
        </button>
      </div>

      {/* Table QR config */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 space-y-3 print:hidden">
        <div className="flex items-center justify-between">
          <label className="text-sm text-white font-medium">QR codes par table</label>
          <button onClick={() => setShowKiosk(!showKiosk)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${showKiosk ? 'bg-amber-500/15 text-amber-400' : 'bg-zinc-800 text-zinc-500'}`}>
            {showKiosk ? `${tableCount} tables` : 'Activer'}
          </button>
        </div>
        {showKiosk && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-500">Nombre de tables :</label>
            <input type="number" value={tableCount} onChange={(e) => setTableCount(parseInt(e.target.value) || 1)}
              className={`${ic} w-20`} min={1} max={50} />
          </div>
        )}
      </div>

      {/* QR Code grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {urls.map((item, i) => (
          <div key={i} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/50 text-center print:border print:border-gray-300 print:rounded-lg print:p-6">
            <p className="text-lg font-bold text-white print:text-black mb-1">{item.icon} {item.label}</p>
            <p className="text-xs text-zinc-500 print:text-gray-500 mb-3">{item.desc}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getQRUrl(item.url)}
              alt={`QR ${item.label}`}
              className="w-48 h-48 mx-auto rounded-lg print:w-40 print:h-40"
            />
            <p className="text-[10px] text-zinc-600 print:text-gray-400 mt-2 break-all">{item.url}</p>
          </div>
        ))}
      </div>

      {/* Location info */}
      {locationName && (
        <p className="text-xs text-zinc-600 text-center print:text-gray-500">
          {locationName}
        </p>
      )}
    </div>
  );
}
