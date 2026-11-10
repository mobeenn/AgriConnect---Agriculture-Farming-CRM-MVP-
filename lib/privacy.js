// Role-specific serializers. Everything is WHITELIST based: a field that is not
// listed here can never reach an API response.
const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
};
const unknownRole = (role) => new Error(`Unknown role for serializer: ${role}`);

const ORDER_FIELDS = ['id', 'requestId', 'productId', 'productName', 'category', 'unit', 'quantity',
  'deliveryLocation', 'requirements', 'status', 'quotationId', 'unitPrice', 'totalPrice',
  'deliveryInfo', 'createdAt', 'updatedAt'];

const nameOf = (list, id, field = 'businessName') => list?.find((x) => x.id === id)?.[field] || 'Deleted account';

export function serializeOrder(o, role, db) {
  const out = pick(o, ORDER_FIELDS);
  out.statusHistory = (o.statusHistory || []).map((h) => ({ status: h.status, at: h.at, note: h.note || '' }));
  if (role === 'buyer') out.supplierRef = o.supplierId;
  else if (role === 'supplier') out.buyerRef = o.buyerId;
  else if (role === 'admin') {
    out.buyerRef = o.buyerId;
    out.supplierRef = o.supplierId;
    out.buyerName = nameOf(db?.buyers, o.buyerId);
    out.supplierName = nameOf(db?.suppliers, o.supplierId);
  } else throw unknownRole(role);
  return out;
}

export function serializeRequest(r, role, db) {
  const out = pick(r, ['id', 'orderId', 'productId', 'productName', 'unit', 'quantity',
    'deliveryLocation', 'requirements', 'status', 'createdAt', 'updatedAt']);
  if (role === 'buyer') out.supplierRef = r.supplierId;
  else if (role === 'supplier') out.buyerRef = r.buyerId;
  else if (role === 'admin') {
    out.buyerRef = r.buyerId; out.supplierRef = r.supplierId;
    out.buyerName = nameOf(db?.buyers, r.buyerId);
    out.supplierName = nameOf(db?.suppliers, r.supplierId);
  } else throw unknownRole(role);
  return out;
}

export function serializeQuotation(q, role, db) {
  const out = pick(q, ['id', 'orderId', 'unitPrice', 'totalPrice', 'deliveryDays', 'validUntil', 'notes', 'status', 'createdAt']);
  if (role === 'buyer') out.supplierRef = q.supplierId;
  else if (role === 'supplier') out.buyerRef = q.buyerId;
  else if (role === 'admin') {
    out.buyerRef = q.buyerId; out.supplierRef = q.supplierId;
    out.supplierName = nameOf(db?.suppliers, q.supplierId);
  } else throw unknownRole(role);
  return out;
}

const PRODUCT_FIELDS = ['id', 'name', 'category', 'description', 'unit', 'pricePerUnit', 'availableQuantity',
  'minOrderQuantity', 'image', 'availability', 'createdAt', 'updatedAt'];

export function serializeProduct(p, role, db) {
  const out = pick(p, PRODUCT_FIELDS);
  if (role === 'buyer') {
    out.supplierRef = p.supplierId;
  } else if (role === 'supplier' || role === 'admin') {
    out.supplierRef = p.supplierId;
    out.lowStockThreshold = p.lowStockThreshold;
    out.lowStock = p.availableQuantity <= p.lowStockThreshold;
    if (role === 'admin') out.supplierName = nameOf(db?.suppliers, p.supplierId);
  } else throw unknownRole(role);
  return out;
}

export function serializeMessage(m, actor, db) {
  const out = { id: m.id, orderId: m.orderId, senderRef: m.senderRef, senderRole: m.senderRole, body: m.body, createdAt: m.createdAt };
  if (actor.role === 'admin') {
    out.senderName = m.senderRole === 'buyer' ? nameOf(db?.buyers, m.senderRef) : nameOf(db?.suppliers, m.senderRef);
  } else {
    out.fromMe = m.senderRef === actor.refId;
    out.read = (m.readBy || []).length > 1;
  }
  return out;
}

export function serializeNotification(n) {
  return pick(n, ['id', 'type', 'title', 'message', 'orderId', 'read', 'createdAt']);
}

export function serializeActivity(a, role) {
  const out = pick(a, ['id', 'action', 'entityRef', 'message', 'createdAt']);
  if (role === 'admin') { out.actorRole = a.actorRole; out.actorRef = a.actorRef; }
  return out;
}

// Full records are only ever returned to admins or to the owner of the record.
export function serializeParty(p, kind) {
  const common = ['id', 'businessName', 'contactPerson', 'email', 'phone', 'location', 'registrationDate', 'status'];
  return pick(p, [...common, kind === 'buyer' ? 'businessType' : 'supplierCategory']);
}

export function serializeUser(u) {
  return pick(u, ['id', 'email', 'role', 'refId', 'name']);
}
