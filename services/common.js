import { nextId } from '../lib/ids.js';

export const nowIso = () => new Date().toISOString();

export function parsePaging(q = {}) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize, 10) || 10));
  return { page, pageSize };
}

export function paginate(list, q = {}) {
  const { page, pageSize } = parsePaging(q);
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const items = list.slice((safePage - 1) * pageSize, safePage * pageSize);
  return { items, meta: { page: safePage, pageSize, total, totalPages } };
}

export function sortBy(list, key, dir = 'asc', getter) {
  const get = getter || ((r) => r[key]);
  const mult = dir === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => {
    const x = get(a); const y = get(b);
    if (x === y) return 0;
    if (x === undefined || x === null) return 1;
    if (y === undefined || y === null) return -1;
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * mult;
  });
}

export const matches = (text, term) => String(text || '').toLowerCase().includes(String(term).toLowerCase());

export function addNotification(db, { userId, type, title, message, orderId = null }) {
  db.notifications.push({
    id: nextId(db, 'notifications', 'NTF', 8001), userId, type, title, message, orderId, read: false, createdAt: nowIso(),
  });
}
export function notifyParty(db, role, refId, payload) {
  const u = db.users.find((x) => x.role === role && x.refId === refId);
  if (u) addNotification(db, { userId: u.id, ...payload });
}
export function notifyAdmins(db, payload) {
  db.users.filter((u) => u.role === 'admin').forEach((u) => addNotification(db, { userId: u.id, ...payload }));
}

// Activity messages must only contain anonymous references.
export function logActivity(db, actor, action, entityRef, message, parties = []) {
  db.activities.push({
    id: nextId(db, 'activities', 'ACT', 9001),
    actorRole: actor.role,
    actorRef: actor.refId || 'ADMIN',
    action, entityRef, message,
    parties: [...new Set([actor.refId, ...parties].filter(Boolean))],
    createdAt: nowIso(),
  });
}
