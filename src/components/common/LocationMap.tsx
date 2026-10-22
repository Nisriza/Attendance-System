import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Crosshair, ExternalLink, Loader2, MapPin, Navigation } from 'lucide-react';

export interface LocationMapPin {
  latitude: number;
  longitude: number;
  accuracy?: number;
  label: string;
  type: 'clock-in' | 'clock-out';
  timestamp?: string;
}

interface LocationMapProps {
  livePosition?: { latitude: number; longitude: number; accuracy: number } | null;
  pins?: LocationMapPin[];
  heightClass?: string;
  locating?: boolean;
  locationError?: string | null;
  onLocate?: () => void;
}

const PIN_COLORS: Record<LocationMapPin['type'], string> = {
  'clock-in': '#059669',
  'clock-out': '#e11d48',
};

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 6px rgba(15,23,42,0.45);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const LocationMap: React.FC<LocationMapProps> = ({
  livePosition,
  pins = [],
  heightClass = 'h-72 sm:h-80',
  locating = false,
  locationError = null,
  onLocate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([3.139, 101.6869], 15);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);

    const timer = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  const pinKey = pins
    .map((p) => `${p.type}:${p.latitude.toFixed(6)}:${p.longitude.toFixed(6)}:${p.label}`)
    .join('|');
  const liveKey = livePosition
    ? `${livePosition.latitude.toFixed(6)}:${livePosition.longitude.toFixed(6)}:${Math.round(livePosition.accuracy)}`
    : '';

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const bounds: L.LatLngExpression[] = [];

    pins.forEach((pin) => {
      if (pin.accuracy && pin.accuracy > 0) {
        L.circle([pin.latitude, pin.longitude], {
          radius: Math.max(pin.accuracy, 5),
          color: PIN_COLORS[pin.type],
          fillColor: PIN_COLORS[pin.type],
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(layer);
      }

      const timestamp = pin.timestamp
        ? `<br/><span style="color:#64748b">${escapeHtml(new Date(pin.timestamp).toLocaleString())}</span>`
        : '';
      L.marker([pin.latitude, pin.longitude], { icon: pinIcon(PIN_COLORS[pin.type]) })
        .addTo(layer)
        .bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;line-height:1.5;">
            <strong>${escapeHtml(pin.label)}</strong><br/>
            ${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}
            ${timestamp}
          </div>`
        );
      bounds.push([pin.latitude, pin.longitude]);
    });

    if (livePosition) {
      L.circle([livePosition.latitude, livePosition.longitude], {
        radius: Math.max(livePosition.accuracy, 5),
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        weight: 1.5,
      }).addTo(layer);

      L.marker([livePosition.latitude, livePosition.longitude], {
        icon: pinIcon('#2563eb'),
        zIndexOffset: 500,
      })
        .addTo(layer)
        .bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;line-height:1.5;">
            <strong>Your current location</strong><br/>
            ${livePosition.latitude.toFixed(6)}, ${livePosition.longitude.toFixed(6)}<br/>
            <span style="color:#64748b">±${Math.round(livePosition.accuracy)}m accuracy</span>
          </div>`
        );
      bounds.push([livePosition.latitude, livePosition.longitude]);
    }

    if (bounds.length === 1) {
      map.setView(bounds[0], 16);
    } else if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 17 });
    }

    setTimeout(() => map.invalidateSize(), 50);
  }, [pinKey, liveKey]);

  const centerLat = livePosition?.latitude ?? pins[0]?.latitude;
  const centerLng = livePosition?.longitude ?? pins[0]?.longitude;
  const externalUrl =
    centerLat !== undefined && centerLng !== undefined
      ? `https://www.google.com/maps?q=${centerLat},${centerLng}`
      : null;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
      <div className={`relative w-full ${heightClass}`}>
        <div ref={containerRef} className="absolute inset-0 z-0" />

        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-blue-600" /> You
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Clock-in
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-rose-600" /> Clock-out
          </span>
        </div>

        {onLocate && (
          <button
            type="button"
            onClick={onLocate}
            disabled={locating}
            className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm border border-slate-200 hover:bg-white transition-colors disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-blue-600" />
            )}
            {locating ? 'Locating...' : 'My location'}
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-white border-t border-slate-200">
        <div className="flex items-start gap-2 text-[11px] text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          {locationError ? (
            <span className="text-rose-700">{locationError}</span>
          ) : livePosition ? (
            <span className="font-mono">
              {livePosition.latitude.toFixed(6)}, {livePosition.longitude.toFixed(6)} · ±
              {Math.round(livePosition.accuracy)}m
            </span>
          ) : (
            <span>{locating ? 'Acquiring your GPS position...' : 'Location not detected yet.'}</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open map
            </a>
          )}
          <span className="inline-flex items-center gap-1 text-slate-400">
            <Navigation className="w-3.5 h-3.5" /> OSM
          </span>
        </div>
      </div>
    </div>
  );
};
