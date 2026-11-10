import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetDb, actors, rejects, loadDb } from './helpers.js';
import { createRequest, updateOrder, getOrder, updateRequest, listOrders } from '../services/orders.js';
import { createQuotation, respondToQuotation } from '../services/quotations.js';
import { updateProduct } from '../services/products.js';
import { createParty, deleteParty, updateParty, listParties } from '../services/parties.js';
import { listNotifications, updateNotification, markAllRead } from '../services/notifications.js';
import { getDashboard } from '../services/dashboard.js';
import { canTransition } from '../lib/workflow.js';

beforeEach(resetDb);
const { admin, buyer, buyer2, supplier } = actors;

test('full order lifecycle with inventory reservation', async () => {
  const before = loadDb().products.find((p) => p.id === 'PRD-3002').availableQuantity;
  const { order } = await createRequest(buyer, { productId: 'PRD-3002', quantity: 30, deliveryLocation: 'Lahore Cantt' });
  assert.match(order.id, /^ORD-\d+$/);
  assert.equal(order.status, 'Pending');
  assert.equal(loadDb().purchaseRequests.at(-1).orderId, order.id);

  const q = await createQuotation(supplier, { orderId: order.id, unitPrice: 6000, deliveryDays: 5, notes: 'Includes loading' });
  assert.equal(q.totalPrice, 180000);
  assert.equal((await getOrder(buyer, order.id)).status, 'Quotation Submitted');

  await respondToQuotation(buyer, q.id, { action: 'accept' });
  assert.equal((await getOrder(buyer, order.id)).status, 'Accepted');
  assert.equal(loadDb().products.find((p) => p.id === 'PRD-3002').availableQuantity, before - 30);

  await updateOrder(supplier, order.id, { status: 'Processing' });
  await updateOrder(supplier, order.id, { status: 'Dispatched', deliveryInfo: { expectedDate: '2026-11-20', carrier: 'Truck' } });
  const delivered = await updateOrder(supplier, order.id, { status: 'Delivered' });
  assert.equal(delivered.deliveryInfo.carrier, 'Truck');
  const done = await updateOrder(buyer, order.id, { status: 'Completed' });
  assert.equal(done.status, 'Completed');
  assert.deepEqual(done.statusHistory.map((h) => h.status), ['Pending', 'Quotation Submitted', 'Accepted', 'Processing', 'Dispatched', 'Delivered', 'Completed']);
  assert.equal(loadDb().purchaseRequests.at(-1).status, 'Completed');
});

test('rejecting a quotation rejects the order; cancelling a pending request works', async () => {
  const { order } = await createRequest(buyer, { productId: 'PRD-3002', quantity: 25, deliveryLocation: 'Lahore' });
  const q = await createQuotation(supplier, { orderId: order.id, unitPrice: 7000, deliveryDays: 3 });
  await respondToQuotation(buyer, q.id, { action: 'reject' });
  assert.equal((await getOrder(buyer, order.id)).status, 'Rejected');
  const r2 = await createRequest(buyer, { productId: 'PRD-3002', quantity: 25, deliveryLocation: 'Lahore' });
  const pr = loadDb().purchaseRequests.at(-1);
  await updateRequest(buyer, pr.id, { status: 'Cancelled' });
  assert.equal((await getOrder(buyer, r2.order.id)).status, 'Cancelled');
});

test('cancelling an accepted order as admin restores stock', async () => {
  const before = loadDb().products.find((p) => p.id === 'PRD-3002').availableQuantity;
  await updateOrder(admin, 'ORD-1011', { status: 'Cancelled' }); // not related product, sanity
  const { order } = await createRequest(buyer, { productId: 'PRD-3002', quantity: 40, deliveryLocation: 'Lahore' });
  const q = await createQuotation(supplier, { orderId: order.id, unitPrice: 6000, deliveryDays: 3 });
  await respondToQuotation(buyer, q.id, { action: 'accept' });
  await updateOrder(admin, order.id, { status: 'Cancelled' });
  assert.equal(loadDb().products.find((p) => p.id === 'PRD-3002').availableQuantity, before);
});

test('request validation: min order, stock, out of stock, missing fields', async () => {
  await rejects(assert, createRequest(buyer, { productId: 'PRD-3002', quantity: 1, deliveryLocation: 'Lahore' }), [422]); // MOQ 20
  await rejects(assert, createRequest(buyer, { productId: 'PRD-3002', quantity: 999999, deliveryLocation: 'Lahore' }), [422]);
  await rejects(assert, createRequest(buyer, { productId: 'PRD-3019', quantity: 1, deliveryLocation: 'Lahore' }), [409]); // out of stock
  await rejects(assert, createRequest(buyer, { productId: 'PRD-3002' }), [422]);
  await rejects(assert, createRequest(buyer, { productId: 'NOPE', quantity: 5, deliveryLocation: 'Lahore' }), [404]);
  await rejects(assert, createRequest(supplier, { productId: 'PRD-3002', quantity: 25, deliveryLocation: 'Lahore' }), [403]);
});

test('quotation rules: only owner supplier, only open orders, buyer-only response', async () => {
  await rejects(assert, createQuotation(buyer, { orderId: 'ORD-1016', unitPrice: 1, deliveryDays: 1 }), [403]);
  await rejects(assert, createQuotation(supplier, { orderId: 'ORD-1003', unitPrice: 1, deliveryDays: 1 }), [403, 404]);
  await rejects(assert, createQuotation(supplier, { orderId: 'ORD-1009', unitPrice: 5, deliveryDays: 2 }), [409]); // already processing
  await rejects(assert, createQuotation(supplier, { orderId: 'ORD-1016', unitPrice: -5, deliveryDays: 2 }), [422]);
  await rejects(assert, respondToQuotation(supplier, 'QUO-6013', { action: 'accept' }), [403]);
  await rejects(assert, respondToQuotation(buyer2, 'QUO-6013', { action: 'accept' }), [403, 404]);
});

test('re-quoting supersedes the previous quotation', async () => {
  await createQuotation(supplier, { orderId: 'ORD-1013', unitPrice: 9000, deliveryDays: 2 });
  const quotes = loadDb().quotations.filter((q) => q.orderId === 'ORD-1013');
  assert.equal(quotes.filter((q) => q.status === 'Submitted').length, 1);
  assert.equal(quotes.filter((q) => q.status === 'Superseded').length, 1);
});

test('transition table', () => {
  assert.ok(canTransition('supplier', 'Accepted', 'Processing'));
  assert.ok(!canTransition('supplier', 'Pending', 'Delivered'));
  assert.ok(canTransition('buyer', 'Delivered', 'Completed'));
  assert.ok(!canTransition('buyer', 'Processing', 'Cancelled'));
  assert.ok(canTransition('admin', 'Completed', 'Processing'));
});

test('low stock alert is raised when inventory drops under threshold', async () => {
  await updateProduct(supplier, 'PRD-3001', { availableQuantity: 20 });
  const n = await listNotifications(supplier, { pageSize: 50 });
  assert.ok(n.items.some((x) => x.type === 'low_stock' && x.message.includes('PRD-3001')));
  const p = await updateProduct(supplier, 'PRD-3001', { availableQuantity: 0 });
  assert.equal(p.availability, 'Out of Stock');
});

test('notifications: only own, mark read, mark all', async () => {
  const list = await listNotifications(buyer, { pageSize: 50 });
  assert.ok(list.meta.unreadCount > 0);
  await updateNotification(buyer, list.items.find((n) => !n.read).id, { read: true });
  await rejects(assert, updateNotification(buyer, 'NTF-8001', { read: true }), [404]); // admin's
  await markAllRead(buyer);
  assert.equal((await listNotifications(buyer, { unread: 'true' })).meta.total, 0);
});

test('party CRUD (admin): create, duplicate email, edit, delete rules', async () => {
  const input = { businessName: 'Test Agro', contactPerson: 'Test Person', email: 'test@agro.pk', phone: '+92 300 0000000', location: 'Lahore', businessType: 'Orchard' };
  const b = await createParty(admin, 'buyer', input);
  assert.equal(b.id, 'BUY-1009');
  await rejects(assert, createParty(admin, 'buyer', input), [409]);
  await rejects(assert, createParty(admin, 'buyer', { ...input, email: 'bad' }), [422]);
  assert.equal((await updateParty(admin, 'buyer', b.id, { location: 'Multan', status: 'Suspended' })).location, 'Multan');
  assert.equal((await listParties(admin, 'buyer', { search: 'test agro' })).meta.total, 1);
  await rejects(assert, deleteParty(admin, 'buyer', 'BUY-1001'), [409]); // open orders
  assert.deepEqual(await deleteParty(admin, 'buyer', b.id), { id: b.id, deleted: true });
  assert.equal(loadDb().users.some((u) => u.email === 'test@agro.pk'), false);
});

test('a party can edit its own profile but not status or email', async () => {
  const p = await updateParty(buyer, 'buyer', 'BUY-1001', { phone: '+92 311 5555555', status: 'Suspended', email: 'x@y.com' });
  assert.equal(p.phone, '+92 311 5555555');
  assert.equal(p.status, 'Active');
  assert.equal(p.email, 'buyer@agriconnect.com');
  await rejects(assert, updateParty(buyer, 'buyer', 'BUY-1002', { phone: '+92 311 5555555' }), [403, 404]);
});

test('dashboard: admin sees platform totals, roles see only their own', async () => {
  const a = await getDashboard(admin);
  assert.equal(a.stats.find((s) => s.key === 'orders').value, 20);
  assert.equal(a.stats.find((s) => s.key === 'buyers').value, 8);
  const b = await getDashboard(buyer);
  assert.ok(b.stats.find((s) => s.key === 'requests').value < 20);
  assert.equal(a.charts.monthlyOrders.length, 6);
  const s = await getDashboard(supplier);
  assert.ok(s.recentOrders.every((o) => o.buyerRef && !o.supplierRef));
  assert.equal((await listOrders(admin, { pageSize: 5 })).meta.total, 20);
});
