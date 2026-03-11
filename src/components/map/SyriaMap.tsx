import { useEffect, useRef } from 'react';
import type { MapMarker } from '../../lib/types';
import { GlassCard } from '../ui/GlassCard';

interface SyriaMapProps {
  markers: MapMarker[];
}

export function SyriaMap({ markers }: SyriaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapRef.current, {
      center: [35.0, 38.5],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    if (!L || !map || !markers.length) return;

    // Clear existing markers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    const maxCount = Math.max(...markers.map(m => m.count), 1);

    markers.forEach(marker => {
      const radius = 8 + (marker.count / maxCount) * 20;

      // Pulsing outer ring
      const pulseMarker = L.circleMarker([marker.lat, marker.lng], {
        radius: radius + 4,
        fillColor: '#f0a500',
        fillOpacity: 0.15,
        color: '#f0a500',
        weight: 1,
        opacity: 0.3,
      }).addTo(map);

      // Main marker
      const mainMarker = L.circleMarker([marker.lat, marker.lng], {
        radius,
        fillColor: '#f0a500',
        fillOpacity: 0.6,
        color: '#f0a500',
        weight: 2,
        opacity: 0.9,
      }).addTo(map);

      // Popup
      const headlinesList = marker.headlines.map(h => `<li style="margin-bottom:4px;font-size:12px;color:#e4e4e7">${h}</li>`).join('');
      mainMarker.bindPopup(`
        <div style="min-width:200px;max-width:280px;background:#12121a;border-radius:12px;padding:12px;border:1px solid #2a2a3e">
          <div style="font-weight:700;font-size:14px;color:#f0a500;margin-bottom:6px">${marker.name}</div>
          <div style="font-size:11px;color:#8888a0;margin-bottom:8px">${marker.count} article${marker.count > 1 ? 's' : ''}</div>
          <ul style="list-style:none;padding:0;margin:0">${headlinesList}</ul>
        </div>
      `, { className: 'dark-popup', maxWidth: 300 });
    });
  }, [markers]);

  return (
    <GlassCard className="overflow-hidden p-0" hover={false}>
      <div className="p-4 pb-2">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-gold" />
          News Geography
        </h3>
        <p className="text-xs text-text-secondary mt-0.5">Click markers for city headlines</p>
      </div>
      <div ref={mapRef} className="h-[320px] w-full" style={{ background: '#0a0a0f' }} />
    </GlassCard>
  );
}
