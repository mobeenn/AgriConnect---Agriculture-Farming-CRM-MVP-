// Orders & Purchase Requests. One purchase request always maps to one order.
import { readDb, mutate } from '../lib/db.js';
import { requireActor, requireRole, assertOrderAccess, scopeOrders } from '../lib/authz.js';
import { notFound, conflict, invalid } from '../lib/errors.js';
import { validate } from '../lib/validation.js';
import { nextId } from '../lib/ids.js';
import { serializeOrder, serializeRequest, serializeQuotation } from '../lib/privacy.js';
import { ORDER_STATUSES, RESERVED_STATUSES, canTransition, allowedTransitions } from '../lib/workflow.js';
import { paginate, sortBy, matches, nowIso, logActivity, notifyParty, notifyAdmins } from './common.js';
import { adjustStock } from './inventory.js';

const requestSchema = {
  quantity: { type: 'number', required: true, min: 0.01, max: 1e9, label: 'Quantity' },
  deliveryLocation: { type: 'string', required: true, minLen: 3, maxLen: 200, noContact: true, label: 'Delivery location' },
  requirements: { type: 'string', maxLen: 1000, noContact: true, label: 'Additional requirements', default: '' },
};
const deliverySchema = {
  expectedDate: { type: 'date', label: 'Expected delivery date' },
  carrier: { type: 'string', maxLen: 60, noContact: true, label: 'Transport method' },
  note: { type: 'string', maxLen: 300, noContact: true, label: 'Delivery note' },
};

/** Core state change used by every endpoint. Must run inside mutate(). */
export function moveOrder(db, actor, order, to, opts = {}) {
  const from = order.status;
  if (!opts.force && !canTransition(actor.role, from, to)) throw conflict(`Cannot change order status from "${from}" to "${to}"`);
  const product = db.products.find((p) => p.id === order.productId);

  if (RESERVED_STATUSES.includes(to) && !order.inventoryReserved) {
    if (!product || product.availableQuantity < order.quantity) throw conflict('Not enough stock available to accept this order');
    adjustStock(db, product, -order.quantity);
    order.inventoryReserved = true;
  } else if (order.inventoryReserved && !RESERVED_STATUSES.includes(to) && to !== 'Completed') {
    if (product) adjustStock(db, product, order.quantity);
    order.inventoryReserved = false;
  }

  order.status = to;
  order.updatedAt = nowIso();
  order.statusHistory.push({ status: to, at: order.updatedAt, note: opts.note || '' });
  const pr = db.purchaseRequests.find((r) => r.orderId === order.id);
  if (pr) { pr.status = to; pr.updatedAt = order.updatedAt; }

  const payload = { type: opts.type || 'order_status', title: opts.title || 'Order status updated', message: opts.message || `Order ${order.id} is now "${to}".`, orderId: order.id };
  if (actor.role !== 'buyer') notifyParty(db, 'buyer', order.buyerId, payload);
  if (actor.role !== 'supplier') notifyParty(db, 'supplier', order.supplierId, payload);
  logActivity(db, actor, 'order.status', order.id, `Order ${order.id} moved to ${to}`, [order.buyerId, order.supplierId]);
}

export async function createRequest(actor, input) {
  requireRole(actor, 'buyer');
  const clean = validate(input, { productId: { type: 'string', required: true, label: 'Product' }, ...requestSchema });
  return mutate((db) => {
    const product = db.products.find((p) => p.id === clean.productId);
    const supplier = product && db.suppliers.find((s) => s.id === product.supplierId);
    if (!product || product.availability === 'Unavailable' || supplier?.status !== 'Active') throw notFound('Product not found');
    if (product.availability === 'Out of Stock' || product.availableQuantity <= 0) throw conflict('This product is currently out of stock');
    if (clean.quantity < product.minOrderQuantity) throw invalid({ quantity: `Minimum order quantity is ${product.minOrderQuantity} ${product.unit}` });
    if (clean.quantity > product.availableQuantity) throw invalid({ quantity: `Only ${product.availableQuantity} ${product.unit} available` });

    const t = nowIso();
    const orderId = nextId(db, 'orders', 'ORD', 1001);
    const reqId = nextId(db, 'purchaseRequests', 'REQ', 5001);
    const order = {
      id: orderId, requestId: reqId, buyerId: actor.refId, supplierId: product.supplierId,
      productId: product.id, productName: product.name, category: product.category, unit: product.unit,
      quantity: clean.quantity, deliveryLocation: clean.deliveryLocation, requirements: clean.requirements,
      status: 'Pending', quotationId: null, unitPrice: null, totalPrice: null, deliveryInfo: null,
      inventoryReserved: false, statusHistory: [{ status: 'Pending', at: t, note: 'Purchase request submitted' }],
      createdAt: t, updatedAt: t,
    };
    const pr = {
      id: reqId, orderId, buyerId: actor.refId, supplierId: product.supplierId, productId: product.id,
      productName: product.name, unit: product.unit, quantity: clean.quantity,
      deliveryLocation: clean.deliveryLocation, requirements: clean.requirements, status: 'Pending', createdAt: t, updatedAt: t,
    };
    db.orders.push(order);
    db.purchaseRequests.push(pr);
    notifyParty(db, 'supplier', order.supplierId, { type: 'new_order', title: 'New purchase request', message: `${actor.refId} requested ${clean.quantity} ${product.unit} of ${product.name}. Order ${orderId}.`, orderId });
    notifyAdmins(db, { type: 'new_order', title: 'New purchase request', message: `${orderId} was submitted by ${actor.refId} for ${order.supplierId}.`, orderId });
    logActivity(db, actor, 'order.create', orderId, `${actor.refId} submitted purchase request ${reqId} (${orderId})`, [order.supplierId]);
    return { order: serializeOrder(order, 'buyer', db), request: serializeRequest(pr, 'buyer', db) };
  });
}

function filterByQuery(list, q, role) {
  if (q.status) { const set = q.status.split(','); list = list.filter((o) => set.includes(o.status)); }
  if (q.search) {
    list = list.filter((o) => [o.id, o.requestId, o.orderId, o.productName, o.buyerId, o.supplierId].some((f) => matches(f, q.search)));
  }
  if (role === 'admin') {
    if (q.buyerRef) list = list.filter((o) => o.buyerId === q.buyerRef);
    if (q.supplierRef) list = list.filter((o) => o.supplierId === q.supplierRef);
  }
  return list;
}

export async function listOrders(actor, q = {}) {
  requireActor(actor);
  const db = readDb();
  let list = filterByQuery(scopeOrders(db, actor), q, actor.role);
  const key = { created: 'createdAt', total: 'totalPrice', status: 'status', id: 'id' }[q.sort] || 'createdAt';
  list = sortBy(list, key, q.dir || 'desc');
  const { items, meta } = paginate(list, q);
  return { items: items.map((o) => serializeOrder(o, actor.role, db)), meta };
}

export async function getOrder(actor, id) {
  requireActor(actor);
  const db = readDb();
  const order = assertOrderAccess(actor, db.orders.find((o) => o.id === id));
  return {
    ...serializeOrder(order, actor.role, db),
    allowedStatuses: allowedTransitions(actor.role, order.status),
    quotations: db.quotations.filter((x) => x.orderId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((x) => serializeQuotation(x, actor.role, db)),
  };
}

export async function updateOrder(actor, id, input) {
  requireActor(actor);
  const clean = validate(input, {
    status: { type: 'enum', values: ORDER_STATUSES, label: 'Status' },
    note: { type: 'string', maxLen: 300, noContact: true, label: 'Note' },
  });
  const delivery = input?.deliveryInfo ? validate(input.deliveryInfo, deliverySchema) : null;
  if (!clean.status && !delivery) throw invalid({ status: 'Provide a new status or delivery information' });
  if (delivery && actor.role === 'buyer') throw invalid({ deliveryInfo: 'Only the supplier can set delivery information' });
  return mutate((db) => {
    const order = assertOrderAccess(actor, db.orders.find((o) => o.id === id));
    if (delivery) {
      if (!['Accepted', 'Processing', 'Dispatched'].includes(clean.status || order.status) && actor.role !== 'admin') throw conflict('Delivery information can only be set on accepted orders');
      order.deliveryInfo = { ...(order.deliveryInfo || {}), ...delivery };
    }
    if (clean.status) moveOrder(db, actor, order, clean.status, { note: clean.note });
    else {
      order.updatedAt = nowIso();
      notifyParty(db, 'buyer', order.buyerId, { type: 'order_status', title: 'Delivery information updated', message: `Delivery details for ${order.id} were updated.`, orderId: order.id });
    }
    return { ...serializeOrder(order, actor.role, db), allowedStatuses: allowedTransitions(actor.role, order.status) };
  });
}

// ---- purchase requests -------------------------------------------------
export async function listRequests(actor, q = {}) {
  requireActor(actor);
  const db = readDb();
  let list = db.purchaseRequests;
  if (actor.role === 'buyer') list = list.filter((r) => r.buyerId === actor.refId);
  if (actor.role === 'supplier') list = list.filter((r) => r.supplierId === actor.refId);
  list = filterByQuery(list, q, actor.role);
  list = sortBy(list, 'createdAt', 'desc');
  const { items, meta } = paginate(list, q);
  return { items: items.map((r) => serializeRequest(r, actor.role, db)), meta };
}

export async function updateRequest(actor, id, input) {
  requireActor(actor);
  const db0 = readDb();
  const pr0 = db0.purchaseRequests.find((r) => r.id === id);
  if (!pr0) throw notFound('Purchase request not found');
  const order0 = db0.orders.find((o) => o.id === pr0.orderId);
  assertOrderAccess(actor, order0); // hides foreign requests
  const editing = ['quantity', 'deliveryLocation', 'requirements'].some((k) => input?.[k] !== undefined);
  if (editing) {
    requireRole(actor, 'buyer');
    const clean = validate(input, requestSchema, { partial: true });
    return mutate((db) => {
      const pr = db.purchaseRequests.find((r) => r.id === id);
      const order = db.orders.find((o) => o.id === pr.orderId);
      if (order.status !== 'Pending') throw conflict('Only requests that are still Pending can be edited');
      const product = db.products.find((p) => p.id === order.productId);
      if (clean.quantity !== undefined && product) {
        if (clean.quantity < product.minOrderQuantity) throw invalid({ quantity: `Minimum order quantity is ${product.minOrderQuantity} ${product.unit}` });
        if (clean.quantity > product.availableQuantity) throw invalid({ quantity: `Only ${product.availableQuantity} ${product.unit} available` });
      }
      Object.assign(pr, clean, { updatedAt: nowIso() });
      Object.assign(order, clean, { updatedAt: nowIso() });
      logActivity(db, actor, 'request.update', pr.id, `Purchase request ${pr.id} was edited`, [order.supplierId]);
      return serializeRequest(pr, actor.role, db);
    });
  }
  const { status, note } = validate(input, {
    status: { type: 'enum', values: ['Rejected', 'Cancelled'], required: true, label: 'Status' },
    note: { type: 'string', maxLen: 300, noContact: true, label: 'Note' },
  });
  return mutate((db) => {
    const pr = db.purchaseRequests.find((r) => r.id === id);
    const order = db.orders.find((o) => o.id === pr.orderId);
    moveOrder(db, actor, order, status, { note });
    return serializeRequest(pr, actor.role, db);
  });
}
