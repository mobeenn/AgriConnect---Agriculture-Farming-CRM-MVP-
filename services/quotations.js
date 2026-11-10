import { readDb, mutate } from '../lib/db.js';
import { requireActor, requireRole, assertOrderAccess, scopeOrders } from '../lib/authz.js';
import { notFound, conflict } from '../lib/errors.js';
import { validate } from '../lib/validation.js';
import { nextId } from '../lib/ids.js';
import { serializeQuotation } from '../lib/privacy.js';
import { paginate, sortBy, nowIso, logActivity, notifyParty } from './common.js';
import { moveOrder } from './orders.js';

const quoteSchema = {
  orderId: { type: 'string', required: true, label: 'Order' },
  unitPrice: { type: 'number', required: true, min: 0.01, max: 1e9, label: 'Unit price' },
  deliveryDays: { type: 'int', required: true, min: 1, max: 365, label: 'Delivery time (days)' },
  validUntil: { type: 'date', label: 'Valid until' },
  notes: { type: 'string', maxLen: 600, noContact: true, label: 'Notes', default: '' },
};

export async function listQuotations(actor, q = {}) {
  requireActor(actor);
  const db = readDb();
  const allowed = new Set(scopeOrders(db, actor).map((o) => o.id));
  let list = db.quotations.filter((x) => allowed.has(x.orderId));
  if (q.orderId) list = list.filter((x) => x.orderId === q.orderId);
  list = sortBy(list, 'createdAt', 'desc');
  const { items, meta } = paginate(list, q);
  return { items: items.map((x) => serializeQuotation(x, actor.role, db)), meta };
}

export async function createQuotation(actor, input) {
  requireRole(actor, 'supplier');
  const clean = validate(input, quoteSchema);
  return mutate((db) => {
    const order = assertOrderAccess(actor, db.orders.find((o) => o.id === clean.orderId));
    if (!['Pending', 'Quotation Submitted'].includes(order.status)) throw conflict(`A quotation cannot be submitted while the order is "${order.status}"`);
    db.quotations.filter((x) => x.orderId === order.id && x.status === 'Submitted').forEach((x) => { x.status = 'Superseded'; });
    const q = {
      id: nextId(db, 'quotations', 'QUO', 6001), orderId: order.id, buyerId: order.buyerId, supplierId: order.supplierId,
      unitPrice: clean.unitPrice, totalPrice: Math.round(clean.unitPrice * order.quantity * 100) / 100,
      deliveryDays: clean.deliveryDays, validUntil: clean.validUntil || null, notes: clean.notes, status: 'Submitted', createdAt: nowIso(),
    };
    db.quotations.push(q);
    order.quotationId = q.id; order.unitPrice = q.unitPrice; order.totalPrice = q.totalPrice;
    moveOrder(db, actor, order, 'Quotation Submitted', {
      force: true, type: 'quotation', title: 'New quotation received',
      message: `${order.supplierId} submitted a quotation for ${order.id}: PKR ${q.totalPrice.toLocaleString('en-PK')}.`,
      note: 'Quotation submitted',
    });
    return serializeQuotation(q, 'supplier', db);
  });
}

export async function respondToQuotation(actor, id, input) {
  requireRole(actor, 'buyer');
  const { action } = validate(input, { action: { type: 'enum', values: ['accept', 'reject'], required: true, label: 'Action' } });
  return mutate((db) => {
    const q = db.quotations.find((x) => x.id === id);
    const order = q && db.orders.find((o) => o.id === q.orderId);
    if (!q || !order || order.buyerId !== actor.refId) throw notFound('Quotation not found');
    if (q.status !== 'Submitted' || order.status !== 'Quotation Submitted') throw conflict('This quotation is no longer open');
    if (action === 'accept') {
      if (q.validUntil && q.validUntil < nowIso().slice(0, 10)) throw conflict('This quotation has expired. Ask the supplier for a new one.');
      q.status = 'Accepted';
      moveOrder(db, actor, order, 'Accepted', { force: true, type: 'quotation', title: 'Quotation accepted', message: `${actor.refId} accepted the quotation for ${order.id}. You can start processing.`, note: 'Quotation accepted' });
    } else {
      q.status = 'Rejected';
      moveOrder(db, actor, order, 'Rejected', { force: true, type: 'quotation', title: 'Quotation rejected', message: `${actor.refId} rejected the quotation for ${order.id}.`, note: 'Quotation rejected' });
    }
    return serializeQuotation(q, 'buyer', db);
  });
}
