export class ApiClientError extends Error {
  constructor(message, status, details) { super(message); this.status = status; this.details = details; }
}

// Browser-side fetch helper. Returns { data, meta }. Throws ApiClientError.
export async function api(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
  if (!res.ok || !json?.success) throw new ApiClientError(json?.error?.message || `Request failed (${res.status})`, res.status, json?.error?.details);
  return json;
}

export const qs = (obj) => new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== false)).toString();
export const money = (v) => (v === null || v === undefined ? 'Not quoted yet' : `PKR ${Number(v).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`);
export const dateOf = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
export const dateTimeOf = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');
export const cx = (...a) => a.filter(Boolean).join(' ');
