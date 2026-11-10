import { readDb, mutate } from '../lib/db.js';
import { requireActor } from '../lib/authz.js';
import { notFound } from '../lib/errors.js';
import { serializeNotification } from '../lib/privacy.js';
import { paginate, sortBy } from './common.js';

export async function listNotifications(actor, q = {}) {
  requireActor(actor);
  const db = readDb();
  const mine = db.notifications.filter((n) => n.userId === actor.userId);
  let list = mine;
  if (q.unread === 'true') list = list.filter((n) => !n.read);
  if (q.type) list = list.filter((n) => n.type === q.type);
  list = sortBy(list, 'createdAt', 'desc');
  const { items, meta } = paginate(list, q);
  return { items: items.map(serializeNotification), meta: { ...meta, unreadCount: mine.filter((n) => !n.read).length } };
}

export async function updateNotification(actor, id, input) {
  requireActor(actor);
  return mutate((db) => {
    const n = db.notifications.find((x) => x.id === id && x.userId === actor.userId);
    if (!n) throw notFound('Notification not found');
    n.read = input?.read === false ? false : true;
    return serializeNotification(n);
  });
}

export async function markAllRead(actor) {
  requireActor(actor);
  return mutate((db) => {
    let count = 0;
    db.notifications.forEach((n) => { if (n.userId === actor.userId && !n.read) { n.read = true; count += 1; } });
    return { updated: count };
  });
}
