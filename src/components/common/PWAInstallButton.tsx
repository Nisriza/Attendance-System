import React, { useState } from 'react';
import { Download, Smartphone, X, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC<{ variant?: 'nav' | 'prominent' }> = ({ variant = 'nav' }) => {
  const { isInstallable, isStandalone, isInstalledApp, isIOS, install, openApp } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running inside the installed app window, hide entirely
  if (isStandalone) {
    return null;
  }

  // App is installed and the browser is not offering an install right now: let the user launch it
  if (isInstalledApp && !isInstallable) {
    if (variant === 'prominent') {
      return (
        <button
          onClick={openApp}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
          title="Open the installed Attendance & Reporting app"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open Attendance &amp; Reporting App</span>
        </button>
      );
    }

    return (
      <button
        onClick={openApp}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-all shadow-2xs"
        title="Open the installed Attendance & Reporting app"
      >
        <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden sm:inline">Open App</span>
      </button>
    );
  }

  const handleInstallClick = async () => {
    // Native install prompt available (Chrome / Edge / Android)
    if (isInstallable) {
      try {
        setInstalling(true);
        await install();
      } finally {
        setInstalling(false);
      }
      return;
    }
    // iOS Safari has no programmatic prompt
    if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const iOSGuideModal = showIOSGuide ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            Install on iPhone / iPad
          </h3>
          <button
            onClick={() => setShowIOSGuide(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3 text-xs text-slate-600 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
              1
            </span>
            <p>
              Tap the <strong>Share</strong> button (box with an arrow pointing up) in Safari's bottom toolbar.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
              2
            </span>
            <p>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
              3
            </span>
            <p>
              Tap <strong>Add</strong> in the top-right corner to launch the app in fullscreen standalone mode.
            </p>
          </div>
          <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-400 italic">
            Already installed? Open the app from your device's Home Screen.
          </div>
        </div>
        <button
          onClick={() => setShowIOSGuide(false)}
          className="mt-6 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition"
        >
          Got It
        </button>
      </div>
    </div>
  ) : null;

  // ---- Compact (navbar) variant: only shown where it is actionable ----
  if (variant === 'nav') {
    if (isInstallable) {
      return (
        <button
          onClick={handleInstallClick}
          disabled={installing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#173B70] bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all shadow-2xs"
          title="Install Student Attendance & Reporting System as a standalone app on your device"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Install App</span>
        </button>
      );
    }

    if (isIOS) {
      return (
        <>
          <button
            onClick={() => setShowIOSGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span>Install App</span>
          </button>
          {iOSGuideModal}
        </>
      );
    }

    return null;
  }

  // ---- Prominent (login page) variant: only when an install is actually possible ----
  // If the browser is not offering an install (e.g. the app is already installed
  // or the browser does not support it), show nothing instead of a stale button.
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        disabled={installing}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#173B70] hover:bg-[#2563EB] text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-60"
        title="Install the Attendance & Reporting app on this device"
      >
        <Download className="w-4 h-4" />
        <span>Install Attendance &amp; Reporting App</span>
      </button>
      {iOSGuideModal}
    </>
  );
};
