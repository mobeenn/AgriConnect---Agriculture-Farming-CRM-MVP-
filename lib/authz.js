import { forbidden, notFound, unauthorized } from './errors.js';

export function requireActor(actor) {
  if (!actor) throw unauthorized();
  return actor;
}
export function requireRole(actor, ...roles) {
  requireActor(actor);
  if (!roles.includes(actor.role)) throw forbidden();
  return actor;
}
export function canAccessOrder(actor, order) {
  if (!actor || !order) return false;
  if (actor.role === 'admin') return true;
  if (actor.role === 'buyer') return order.buyerId === actor.refId;
  if (actor.role === 'supplier') return order.supplierId === actor.refId;
  return false;
}
// Returns 404 (not 403) for foreign records so their existence is not revealed.
export function assertOrderAccess(actor, order) {
  if (!canAccessOrder(actor, order)) throw notFound('Order not found');
  return order;
}
export function canManageProduct(actor, product) {
  if (!actor || !product) return false;
  return actor.role === 'admin' || (actor.role === 'supplier' && product.supplierId === actor.refId);
}
export function scopeOrders(db, actor) {
  if (actor.role === 'admin') return db.orders;
  if (actor.role === 'buyer') return db.orders.filter((o) => o.buyerId === actor.refId);
  if (actor.role === 'supplier') return db.orders.filter((o) => o.supplierId === actor.refId);
  return [];
}
