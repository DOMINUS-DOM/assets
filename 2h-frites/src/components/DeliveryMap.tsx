'use client';

import { useEffect, useRef } from 'react';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

interface Zone {
  id: string;
  name: string;
  fee: number;
  color: string;
  center: [number, number];
  radius: number;
}

interface DeliveryMapProps {
  zones: Zone[];
  drivers?: { id: string; name: string; lat: number; lng: number }[];
  customerLocation?: [number, number];
  center?: [number, number];
  height?: string;
}

export default function DeliveryMap({ zones, drivers = [], customerLocation, center = [50.479, 4.186], height = '400px' }: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);

  // Load Leaflet + init map once
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    // Load CSS
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    let cancelled = false;

    import('leaflet').then((leaflet) => {
      if (cancelled || !containerRef.current) return;
      const L = leaflet.default;
      leafletRef.current = L;

      // Prevent double init
      if (mapInstanceRef.current) return;

      const m = L.map(containerRef.current).setView(center, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(m);

      mapInstanceRef.current = m;

      // Draw initial content
      drawContent(L, m, zones, drivers, customerLocation);
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update content when data changes
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Small delay to ensure map is fully initialized
    const timer = setTimeout(() => {
      try {
        drawContent(L, map, zones, drivers, customerLocation);
      } catch {}
    }, 100);

    return () => clearTimeout(timer);
  }, [zones, drivers, customerLocation]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}
      className="bg-zinc-800"
    />
  );
}

function drawContent(L: any, map: any, zones: any[], drivers: any[], customerLocation?: [number, number]) {
  if (!map || !L) return;

  try {
    // Clear existing overlay layers
    map.eachLayer((layer: any) => {
      if (layer._isZone || layer._isDriver || layer._isCustomer) {
        map.removeLayer(layer);
      }
    });

    // Draw zone circles
    zones.forEach((zone) => {
      if (!zone.center || !zone.radius) return;
      const circle = L.circle(zone.center, {
        radius: zone.radius,
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);
      circle._isZone = true;
      circle.bindPopup(`
        <div style="text-align:center;font-family:sans-serif;">
          <strong>${zone.name}</strong><br>
          <span style="color:${zone.color};font-size:18px;font-weight:bold;">${(zone.fee || 0).toFixed(2)} €</span><br>
          <small>Frais de livraison</small>
        </div>
      `);
    });

    // Draw drivers
    drivers.forEach((drv) => {
      if (!drv.lat || !drv.lng) return;
      const icon = L.divIcon({
        html: `<div style="background:#f59e0b;color:#000;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🛵</div>`,
        iconSize: [32, 32],
        className: '',
      });
      const marker = L.marker([drv.lat, drv.lng], { icon }).addTo(map);
      marker._isDriver = true;
      marker.bindPopup(`<strong>${drv.name}</strong>`);
    });

    // Draw customer location
    if (customerLocation) {
      const icon = L.divIcon({
        html: `<div style="background:#ef4444;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid #fff;">📍</div>`,
        iconSize: [28, 28],
        className: '',
      });
      const marker = L.marker(customerLocation, { icon }).addTo(map);
      marker._isCustomer = true;
    }
  } catch (e) {
    console.warn('[DeliveryMap] Draw error:', e);
  }
}
