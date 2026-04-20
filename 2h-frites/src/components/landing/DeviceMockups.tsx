'use client';

/* ─── Browser Frame ─── */
function BrowserFrame({ children, url }: { children: React.ReactNode; url: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E2DC] bg-white shadow-xl shadow-black/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FAFAF8] border-b border-[#EDEBE7]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#E5E2DC]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#E5E2DC]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#E5E2DC]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-3 py-0.5 rounded-md bg-[#EDEBE7] text-[10px] text-[#8A8A8A] font-mono">{url}</div>
        </div>
      </div>
      <div className="bg-[#FAFAF8]">{children}</div>
    </div>
  );
}

/* ─── Phone Frame ─── */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[260px] rounded-[2rem] border-[6px] border-[#D4D0C8] bg-white shadow-xl shadow-black/5 overflow-hidden">
      {/* Notch */}
      <div className="flex justify-center pt-2 pb-1 bg-[#FAFAF8]">
        <div className="w-20 h-4 rounded-full bg-[#EDEBE7]" />
      </div>
      <div className="bg-[#FAFAF8]">{children}</div>
      {/* Home indicator */}
      <div className="flex justify-center py-2 bg-[#FAFAF8]">
        <div className="w-24 h-1 rounded-full bg-[#D4D0C8]" />
      </div>
    </div>
  );
}

/* ═══ POS Mockup ═══ */
export function MockupPOS() {
  return (
    <BrowserFrame url="mon-restaurant.brizoapp.com/pos">
      <div className="p-4 text-[#1A1A1A]" style={{ fontSize: 11 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#EDEBE7] flex items-center justify-center text-[8px]">🍽️</div>
            <span className="font-semibold text-[11px]">Caisse POS</span>
            <span className="text-[9px] text-[#8A8A8A]">Carmelo</span>
          </div>
          <span className="text-[9px] text-[#8A8A8A]">Comptoir</span>
        </div>
        <div className="flex gap-3">
          {/* Products grid */}
          <div className="flex-1 space-y-1.5">
            <div className="flex gap-1.5">
              {['Classique', 'Fricadelle', 'Pain-frites'].map((n, i) => (
                <div key={i} className="flex-1 py-2 rounded-lg bg-white border border-[#E5E2DC] text-center text-[9px] text-[#8A8A8A]">{n}</div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { name: 'Frites M', price: '3,80', hot: true },
                { name: 'Coca-Cola', price: '2,50' },
                { name: 'Hamburger', price: '4,00' },
                { name: 'Andalouse', price: '0,90' },
                { name: 'Eau plate', price: '2,20' },
                { name: 'Nuggets', price: '4,50' },
              ].map((p, i) => (
                <div key={i} className={`p-2 rounded-lg border text-center ${p.hot ? 'bg-violet-50 border-violet-200' : 'bg-white border-[#E5E2DC]'}`}>
                  <div className="text-[9px] text-[#3A3A3A] truncate">{p.name}</div>
                  <div className="text-[10px] font-bold text-[#7C3AED] mt-0.5">{p.price} &euro;</div>
                </div>
              ))}
            </div>
          </div>
          {/* Ticket */}
          <div className="w-[140px] shrink-0">
            <div className="rounded-lg bg-white border border-[#E5E2DC] p-2.5 space-y-1.5">
              <div className="text-[9px] text-[#8A8A8A] font-medium">Ticket #047</div>
              {[
                { name: 'Frites M Sel', price: '3,80' },
                { name: 'Coca-Cola', price: '2,50' },
                { name: 'Hamburger', price: '4,00' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between text-[9px]">
                  <span className="text-[#6B6B6B]">{item.name}</span>
                  <span className="text-[#1A1A1A]">{item.price}</span>
                </div>
              ))}
              <div className="border-t border-[#EDEBE7] pt-1.5 flex justify-between">
                <span className="text-[10px] font-bold text-[#1A1A1A]">Total</span>
                <span className="text-[10px] font-bold text-[#7C3AED]">10,30 &euro;</span>
              </div>
              <div className="mt-1 py-1.5 rounded-lg bg-[#1A1A1A] text-center text-[9px] font-bold text-white">
                Encaisser
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

/* ═══ Menu Web Mockup ═══ */
export function MockupWebMenu() {
  return (
    <PhoneFrame>
      <div className="px-3 pb-3 text-[#1A1A1A]" style={{ fontSize: 11 }}>
        <div className="flex items-center justify-between py-2 mb-2">
          <div className="w-6 h-6 rounded bg-[#EDEBE7]" />
          <span className="text-[10px] font-semibold">Menu</span>
          <div className="w-5 h-5 rounded bg-[#EDEBE7] flex items-center justify-center text-[8px]">🛒</div>
        </div>
        <div className="flex gap-1.5 mb-3 overflow-hidden">
          {['🍟 Frites', '🍔 Burgers', '🥤 Boissons'].map((c, i) => (
            <div key={i} className={`px-2.5 py-1.5 rounded-lg text-[9px] whitespace-nowrap shrink-0 ${i === 0 ? 'bg-violet-50 text-[#7C3AED] border border-violet-200' : 'bg-white text-[#8A8A8A] border border-[#E5E2DC]'}`}>{c}</div>
          ))}
        </div>
        <div className="space-y-2">
          {[
            { name: 'Frites moyen', price: '3,80', tag: '⭐' },
            { name: 'Frites grand', price: '4,50' },
            { name: 'Hamburger classique', price: '4,00', tag: 'Populaire' },
          ].map((p, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E5E2DC]">
              <div>
                <div className="text-[10px] font-medium text-[#1A1A1A]">{p.name}</div>
                {p.tag && <div className="text-[8px] text-[#7C3AED] mt-0.5">{p.tag}</div>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#7C3AED]">{p.price} &euro;</span>
                <div className="w-6 h-6 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white text-[10px] font-bold">+</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ═══ Kiosk Mockup ═══ */
export function MockupKiosk() {
  return (
    <div className="mx-auto w-[280px] rounded-2xl border-[5px] border-[#D4D0C8] bg-[#FAFAF8] shadow-xl shadow-black/5 overflow-hidden">
      <div className="flex flex-col items-center justify-center py-10 px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-blue-50 border border-violet-200 flex items-center justify-center mb-6">
          <span className="text-2xl">🍽️</span>
        </div>
        <div className="text-[#1A1A1A] font-bold text-sm mb-1 tracking-tight">Mon Restaurant</div>
        <div className="text-[#8A8A8A] text-[10px] mb-8">Cuisine traditionnelle</div>
        <div className="w-full py-4 rounded-2xl bg-[#1A1A1A] text-center text-white font-extrabold text-sm shadow-lg">
          Commander ici
        </div>
        <div className="flex gap-3 mt-6">
          {['🇫🇷', '🇬🇧', '🇪🇸', '🇳🇱'].map((f, i) => (
            <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${i === 0 ? 'bg-white border border-[#E5E2DC]' : 'bg-[#EDEBE7]/50'}`}>{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ KDS Mockup ═══ */
export function MockupKDS() {
  return (
    <BrowserFrame url="mon-restaurant.brizoapp.com/admin/kitchen">
      <div className="p-3 text-[#1A1A1A]" style={{ fontSize: 11 }}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-[11px]">Ecran Cuisine</span>
          <span className="text-[9px] text-emerald-600">● 3 en cours</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: '#042', time: '2 min', items: ['Frites M Sel', 'Hamburger', '\u2192 Andalouse'], status: 'new' },
            { id: '#041', time: '5 min', items: ['Pain-frites', '\u2192 Fricadelle', '\u2192 Bearnaise'], status: 'prep' },
            { id: '#040', time: '8 min', items: ['Frites G Epice', 'Coca-Cola'], status: 'ready' },
          ].map((order, i) => (
            <div key={i} className={`rounded-xl border p-2.5 ${
              order.status === 'new' ? 'bg-amber-50 border-amber-200' :
              order.status === 'prep' ? 'bg-blue-50 border-blue-200' :
              'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[11px] text-[#1A1A1A]">{order.id}</span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${
                  order.status === 'new' ? 'bg-amber-100 text-amber-700' :
                  order.status === 'prep' ? 'bg-blue-100 text-blue-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {order.status === 'new' ? 'NOUVEAU' : order.status === 'prep' ? 'EN COURS' : 'PRET'}
                </span>
              </div>
              <div className="space-y-1">
                {order.items.map((item, j) => (
                  <div key={j} className={`text-[9px] ${item.startsWith('\u2192') ? 'text-[#8A8A8A] pl-2' : 'text-[#3A3A3A]'}`}>{item}</div>
                ))}
              </div>
              <div className="text-[8px] text-[#B0ADA6] mt-2">il y a {order.time}</div>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}
