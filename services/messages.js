import { readDb, mutate } from '../lib/db.js';
import { requireActor, requireRole, assertOrderAccess, scopeOrders } from '../lib/authz.js';
import { conflict } from '../lib/errors.js';
import { validate } from '../lib/validation.js';
import { nextId } from '../lib/ids.js';
import { serializeMessage } from '../lib/privacy.js';
import { nowIso, notifyParty, logActivity, sortBy } from './common.js';

// Conversations are keyed by order id; participants are only shown as BUY-/SUP- references.
export async function listConversations(actor) {
  requireActor(actor);
  const db = readDb();
  const rows = scopeOrders(db, actor).map((o) => {
    const msgs = db.messages.filter((m) => m.orderId === o.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const last = msgs[msgs.length - 1];
    const row = {
      orderId: o.id, productName: o.productName, status: o.status, messageCount: msgs.length,
      lastMessage: last ? { body: last.body, createdAt: last.createdAt, senderRef: last.senderRef } : null,
      updatedAt: last?.createdAt || o.updatedAt,
    };
    if (actor.role === 'buyer') { row.counterpartRef = o.supplierId; row.unread = msgs.filter((m) => !m.readBy.includes(actor.refId)).length; }
    if (actor.role === 'supplier') { row.counterpartRef = o.buyerId; row.unread = msgs.filter((m) => !m.readBy.includes(actor.refId)).length; }
    if (actor.role === 'admin') { row.buyerRef = o.buyerId; row.supplierRef = o.supplierId; }
    return row;
  });
  return sortBy(actor.role === 'admin' ? rows.filter((r) => r.messageCount > 0) : rows, 'updatedAt', 'desc');
}

export async function listMessages(actor, orderId) {
  requireActor(actor);
  if (!orderId) throw conflict('orderId is required');
  if (actor.role === 'admin') {
    const db = readDb();
    assertOrderAccess(actor, db.orders.find((o) => o.id === orderId));
    return db.messages.filter((m) => m.orderId === orderId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((m) => serializeMessage(m, actor, db));
  }
  return mutate((db) => {
    assertOrderAccess(actor, db.orders.find((o) => o.id === orderId));
    const msgs = db.messages.filter((m) => m.orderId === orderId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    msgs.forEach((m) => { if (!m.readBy.includes(actor.refId)) m.readBy.push(actor.refId); });
    return msgs.map((m) => serializeMessage(m, actor, db));
  });
}

export async function sendMessage(actor, input) {
  requireRole(actor, 'buyer', 'supplier');
  const clean = validate(input, {
    orderId: { type: 'string', required: true, label: 'Order' },
    body: { type: 'string', required: true, maxLen: 1000, noContact: true, label: 'Message' },
  });
  return mutate((db) => {
    const order = assertOrderAccess(actor, db.orders.find((o) => o.id === clean.orderId));
    if (order.status === 'Cancelled') throw conflict('This order was cancelled. Messaging is closed.');
    const m = { id: nextId(db, 'messages', 'MSG', 7001), orderId: order.id, senderRef: actor.refId, senderRole: actor.role, body: clean.body, createdAt: nowIso(), readBy: [actor.refId] };
    db.messages.push(m);
    const [role, ref] = actor.role === 'buyer' ? ['supplier', order.supplierId] : ['buyer', order.buyerId];
    notifyParty(db, role, ref, { type: 'message', title: 'New message', message: `${actor.refId} sent a message about ${order.id}.`, orderId: order.id });
    logActivity(db, actor, 'message.send', order.id, `${actor.refId} sent a message on ${order.id}`, [role === 'buyer' ? order.buyerId : order.supplierId]);
    return serializeMessage(m, actor, db);
  });
}
