import type { Request } from 'express';

export function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const firstHop = raw?.split(',')[0]?.trim();
  return firstHop || req.ip || req.socket?.remoteAddress || 'unknown';
}

export function cleanDeviceId(value: unknown): string | undefined {
  const id = typeof value === 'string' ? value.trim() : '';
  return id ? id.slice(0, 100) : undefined;
}

export function deviceLabel(userAgent: string | undefined): string {
  const ua = userAgent || '';
  if (!ua) return 'Unknown device';

  let os = '';
  if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipod/i.test(ua)) os = 'iPhone';
  else if (/ipad/i.test(ua)) os = 'iPad';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os x|macintosh/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = '';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';

  const formFactor = /ipad|tablet/i.test(ua)
    ? 'Tablet'
    : /mobile|iphone|ipod|android/i.test(ua)
      ? 'Mobile'
      : 'Desktop';

  const name = [browser, os].filter(Boolean).join(' on ') || 'Unknown device';
  return `${name} (${formFactor})`;
}
