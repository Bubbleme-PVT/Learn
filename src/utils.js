
export const STORAGE_KEY = 'shopify-mastery-platform-state-v3';

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function qsa(selector, scope = document) {
  return [...scope.querySelectorAll(selector)];
}

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function formatPercent(value) {
  return `${Math.round(value)}%`;
}

export function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function slugToHash(slug) {
  return `#topic:${slug}`;
}

export function parseTopicHash(hash = window.location.hash) {
  if (!hash?.startsWith('#topic:')) return null;
  return hash.replace('#topic:', '').trim();
}

export function downloadTextFile(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function toTitleCase(value) {
  return String(value).replace(/\b\w/g, char => char.toUpperCase());
}
