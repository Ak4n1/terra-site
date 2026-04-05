export function formatUserAgentSummary(userAgent: string | null | undefined): string | null {
  const raw = (userAgent ?? '').trim();
  if (!raw) {
    return null;
  }

  const browser = detectBrowser(raw);
  const os = detectOs(raw);
  const deviceType = detectDeviceType(raw);

  return `${browser} · ${os} · ${deviceType}`;
}

function detectBrowser(userAgent: string): string {
  let match = userAgent.match(/Edg\/(\d+)/i);
  if (match) {
    return `Edge ${match[1]}`;
  }

  match = userAgent.match(/OPR\/(\d+)/i);
  if (match) {
    return `Opera ${match[1]}`;
  }

  match = userAgent.match(/Firefox\/(\d+)/i);
  if (match) {
    return `Firefox ${match[1]}`;
  }

  match = userAgent.match(/Chrome\/(\d+)/i);
  if (match) {
    return `Chrome ${match[1]}`;
  }

  match = userAgent.match(/Version\/(\d+).+Safari\//i);
  if (match) {
    return `Safari ${match[1]}`;
  }

  match = userAgent.match(/MSIE (\d+)/i);
  if (match) {
    return `IE ${match[1]}`;
  }

  match = userAgent.match(/Trident\/.*rv:(\d+)/i);
  if (match) {
    return `IE ${match[1]}`;
  }

  return 'Unknown browser';
}

function detectOs(userAgent: string): string {
  if (/Windows NT/i.test(userAgent)) {
    return 'Windows';
  }

  if (/CrOS/i.test(userAgent)) {
    return 'ChromeOS';
  }

  let match = userAgent.match(/Android (\d+(?:\.\d+)?)/i);
  if (match) {
    return `Android ${match[1]}`;
  }

  match = userAgent.match(/iPhone OS (\d+(?:[_\d]+)?)/i);
  if (match) {
    return `iOS ${match[1].replaceAll('_', '.')}`;
  }

  match = userAgent.match(/iPad; CPU OS (\d+(?:[_\d]+)?)/i);
  if (match) {
    return `iPadOS ${match[1].replaceAll('_', '.')}`;
  }

  match = userAgent.match(/Mac OS X (\d+(?:[_\d]+)?)/i);
  if (match) {
    return `macOS ${match[1].replaceAll('_', '.')}`;
  }

  if (/Linux/i.test(userAgent)) {
    return 'Linux';
  }

  return 'Unknown OS';
}

function detectDeviceType(userAgent: string): string {
  if (/\b(bot|spider|crawl|slurp)\b/i.test(userAgent)) {
    return 'Bot';
  }

  if (/\b(iPad|Tablet)\b/i.test(userAgent)) {
    return 'Tablet';
  }

  const isAndroid = /\bAndroid\b/i.test(userAgent);
  const hasMobileToken = /\bMobile\b/i.test(userAgent);
  if (isAndroid && !hasMobileToken) {
    return 'Tablet';
  }

  if (/\b(iPhone|Mobi|Mobile)\b/i.test(userAgent)) {
    return 'Mobile';
  }

  return 'Desktop';
}
