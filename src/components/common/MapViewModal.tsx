import React, { useEffect, useRef } from 'react';
import { X, Navigation, Crosshair, ExternalLink, Copy, Check } from 'lucide-react';
import L from 'leaflet';

interface MapViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  timestamp?: string;
}

export const MapViewModal: React.FC<MapViewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  latitude,
  longitude,
  accuracyMeters,
  timestamp,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Fix leaflet marker default icon
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    // Clean up old map instance if existing
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current).setView([latitude, longitude], 16);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Accuracy radius circle
    L.circle([latitude, longitude], {
      radius: Math.max(accuracyMeters, 5),
      color: '#2563EB',
      fillColor: '#3B82F6',
      fillOpacity: 0.18,
      weight: 1.5,
    }).addTo(map);

    // Marker
    const marker = L.marker([latitude, longitude], { icon: defaultIcon }).addTo(map);
    marker
      .bindPopup(
        `<div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
          <strong>${title}</strong><br/>
          Lat: ${latitude.toFixed(6)}<br/>
          Lng: ${longitude.toFixed(6)}<br/>
          Accuracy: ±${Math.round(accuracyMeters)}m
        </div>`
      )
      .openPopup();

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, latitude, longitude, accuracyMeters, title]);

  if (!isOpen) return null;

  const copyCoordinates = () => {
    navigator.clipboard.writeText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const externalMapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              {title}
            </h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="relative w-full h-80 bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
        </div>

        {/* Telemetry Footer */}
        <div className="p-6 bg-white space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-0.5">Latitude / Longitude</span>
              <span className="text-sm font-mono tabular-nums font-semibold text-slate-900 block">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-0.5">GPS Accuracy Radius</span>
              <span className="text-sm font-semibold text-blue-700 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" />
                ±{Math.round(accuracyMeters)} meters
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-0.5">Recorded Timestamp</span>
              <span className="text-xs font-mono text-slate-700 block mt-1">
                {timestamp ? new Date(timestamp).toLocaleString() : 'Just now'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={copyCoordinates}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied Coordinates' : 'Copy GPS Coordinates'}
            </button>
            <a
              href={externalMapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
            >
              Open in External Map
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
