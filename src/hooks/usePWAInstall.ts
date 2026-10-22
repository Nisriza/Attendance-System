import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INSTALLED_KEY = 'geoattend_pwa_installed';

function readInstalledFlag(): boolean {
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
}

function persistInstalled(): void {
  try {
    localStorage.setItem(INSTALLED_KEY, '1');
  } catch {
    /* ignore storage failures */
  }
}

function clearInstalledFlag(): void {
  try {
    localStorage.removeItem(INSTALLED_KEY);
  } catch {
    /* ignore storage failures */
  }
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const modes = ['standalone', 'minimal-ui', 'fullscreen', 'window-controls-overlay'];
  if (modes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)) return true;
  // iOS Safari exposes navigator.standalone
  return (window.navigator as { standalone?: boolean }).standalone === true;
}

// --- Shared install-prompt capture (module scope) -------------------------
// `beforeinstallprompt` only fires when the app is installable AND not yet
// installed, so its presence is the reliable "not installed" signal. It fires
// once per page load, so a single global listener keeps every component
// (nav, login page, banner) in sync.
let capturedPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

function notifyPromptChange(prompt: BeforeInstallPromptEvent | null) {
  capturedPrompt = prompt;
  // A live prompt means the browser currently offers to install it => not installed.
  if (prompt) clearInstalledFlag();
  promptListeners.forEach((listener) => listener(prompt));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    notifyPromptChange(event as BeforeInstallPromptEvent);
  });

  window.addEventListener('appinstalled', () => {
    persistInstalled();
    notifyPromptChange(null);
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(capturedPrompt);
  // Installed only if remembered AND the browser is not currently offering an install.
  const [isInstalledApp, setIsInstalledApp] = useState<boolean>(() => readInstalledFlag() && !capturedPrompt);
  const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    const onPromptChange = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
      // Prompt present => installable now => not installed. Prompt cleared => just installed.
      setIsInstalledApp(prompt ? false : true);
    };
    promptListeners.add(onPromptChange);

    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    const syncStandalone = () => {
      const standalone = detectStandalone();
      setIsStandalone(standalone);
      if (standalone) {
        persistInstalled();
        setIsInstalledApp(true);
      }
    };
    syncStandalone();
    standaloneMedia.addEventListener?.('change', syncStandalone);

    // Chrome/Android: confirm a matching install already exists on the device.
    const nav = window.navigator as { getInstalledRelatedApps?: () => Promise<unknown[]> };
    if (typeof nav.getInstalledRelatedApps === 'function') {
      nav
        .getInstalledRelatedApps()
        .then((apps) => {
          if (apps && apps.length > 0) {
            persistInstalled();
            setIsInstalledApp(true);
          }
        })
        .catch(() => {
          /* not supported / blocked */
        });
    }

    return () => {
      promptListeners.delete(onPromptChange);
      standaloneMedia.removeEventListener?.('change', syncStandalone);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      persistInstalled();
      setIsInstalledApp(true);
      notifyPromptChange(null);
      return true;
    }
    return false;
  };

  // Opens the installed app. On Android the in-scope URL launches the installed
  // app; elsewhere it opens the app in a new window/tab as a best effort.
  const openApp = () => {
    window.open('/', '_blank', 'noopener,noreferrer');
  };

  return {
    isInstallable: !!deferredPrompt,
    isStandalone,
    isInstalledApp,
    isIOS,
    isAndroid,
    install,
    openApp,
  };
}
