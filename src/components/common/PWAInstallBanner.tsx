import React, { useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';

const DISMISS_KEY = 'geoattend_install_banner_dismissed';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isStandalone, isInstalledApp, isAndroid, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [installing, setInstalling] = useState(false);

  // Auto-appears only on Android when the native install prompt is available
  if (!isAndroid || !isInstallable || isStandalone || isInstalledApp || dismissed) {
    return null;
  }

  const persistDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const ok = await install();
      if (ok) {
        persistDismiss();
        setDismissed(true);
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    persistDismiss();
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4 animate-in slide-in-from-bottom-4 fade-in">
      <div className="mx-auto max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#173B70] text-white flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-tight">Add to Home Screen</p>
          <p className="text-[11px] text-slate-500 leading-snug">
            Install the Attendance &amp; Reporting app for quick, fullscreen access.
          </p>
        </div>
        <button
          onClick={handleInstall}
          disabled={installing}
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#173B70] hover:bg-[#2563EB] rounded-xl transition-colors disabled:opacity-60"
        >
          <Download className="w-3.5 h-3.5" />
          {installing ? 'Adding…' : 'Add'}
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
          aria-label="Dismiss install banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
