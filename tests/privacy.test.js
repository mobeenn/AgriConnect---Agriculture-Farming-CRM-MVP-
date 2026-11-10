import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetDb, actors, assertNoLeak, rejects, loadDb } from './helpers.js';
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../services/products.js';
import { listOrders, getOrder, listRequests, updateOrder, createRequest } from '../services/orders.js';
import { listQuotations } from '../services/quotations.js';
import { listConversations, listMessages, sendMessage } from '../services/messages.js';
import { listNotifications } from '../services/notifications.js';
import { getDashboard } from '../services/dashboard.js';
import { listParties, getParty, getProfile } from '../services/parties.js';
import { getSettings } from '../services/settings.js';
import { login } from '../services/auth.js';

beforeEach(resetDb);
const { admin, buyer, buyer2, supplier, supplier2 } = actors;

test('buyer never receives supplier identity from any endpoint', async () => {
  const bag = {
    products: await listProducts(buyer, { pageSize: 100 }),
    product: await getProduct(buyer, 'PRD-3001'),
    orders: await listOrders(buyer, { pageSize: 100 }),
    order: await getOrder(buyer, 'ORD-1013'),
    requests: await listRequests(buyer, { pageSize: 100 }),
    quotes: await listQuotations(buyer, { pageSize: 100 }),
    conversations: await listConversations(buyer),
    messages: await listMessages(buyer, 'ORD-1013'),
    notifications: await listNotifications(buyer, { pageSize: 100 }),
    dashboard: await getDashboard(buyer),
    profile: await getProfile(buyer),
  };
  for (const [k, v] of Object.entries(bag)) assertNoLeak(assert, v, 'supplier', `buyer/${k}`);
  assert.equal(bag.product.supplierRef, 'SUP-2001');
  assert.ok(bag.orders.items.every((o) => /^SUP-\d+$/.test(o.supplierRef) && o.buyerId === undefined && o.supplierId === undefined));
});

test('supplier never receives buyer identity from any endpoint', async () => {
  const bag = {
    products: await listProducts(supplier, { pageSize: 100 }),
    orders: await listOrders(supplier, { pageSize: 100 }),
    order: await getOrder(supplier, 'ORD-1013'),
    requests: await listRequests(supplier, { pageSize: 100 }),
    quotes: await listQuotations(supplier, { pageSize: 100 }),
    conversations: await listConversations(supplier),
    messages: await listMessages(supplier, 'ORD-1013'),
    notifications: await listNotifications(supplier, { pageSize: 100 }),
    dashboard: await getDashboard(supplier),
  };
  for (const [k, v] of Object.entries(bag)) assertNoLeak(assert, v, 'buyer', `supplier/${k}`);
  assert.ok(bag.orders.items.every((o) => /^BUY-\d+$/.test(o.buyerRef) && o.supplierRef === undefined));
});

test('privacy holds for newly created data too (request, quote, message, notification)', async () => {
  const { order } = await createRequest(buyer, { productId: 'PRD-3004', quantity: 20, deliveryLocation: 'Lahore Cantt', requirements: 'Sealed packs' });
  const sup = { userId: 'USR-SUP-2009', role: 'supplier', refId: 'SUP-2009' };
  const { createQuotation } = await import('../services/quotations.js');
  await createQuotation(sup, { orderId: order.id, unitPrice: 11000, deliveryDays: 4 });
  await sendMessage(sup, { orderId: order.id, body: 'Quotation sent, ready to dispatch.' });
  assertNoLeak(assert, await getOrder(buyer, order.id), 'supplier', 'new order');
  assertNoLeak(assert, await listMessages(buyer, order.id), 'supplier', 'new messages');
  assertNoLeak(assert, await listNotifications(buyer, { pageSize: 100 }), 'supplier', 'new notifications');
  assertNoLeak(assert, await listNotifications(sup, { pageSize: 100 }), 'buyer', 'supplier notifications');
});

test('admin can see complete buyer and supplier information', async () => {
  const o = await getOrder(admin, 'ORD-1013');
  assert.equal(o.buyerName, 'Green Valley Agro Mart');
  assert.equal(o.supplierName, 'Fertile Fields Seeds Co.');
  const b = await getParty(admin, 'buyer', 'BUY-1001');
  assert.equal(b.email, 'buyer@agriconnect.com');
  assert.ok(b.orders.length > 0);
  assert.ok(!JSON.stringify(await listParties(admin, 'supplier')).includes('passwordHash'));
});

test('buyers and suppliers cannot use admin party endpoints', async () => {
  for (const a of [buyer, supplier]) {
    await rejects(assert, listParties(a, 'buyer'), [403]);
    await rejects(assert, listParties(a, 'supplier'), [403]);
    await rejects(assert, getParty(a, 'supplier', 'SUP-2002'), [403]);
    await rejects(assert, getSettings(a), [403]);
  }
});

test('ownership: buyer cannot read another buyer\'s order; supplier cannot read unassigned order', async () => {
  await rejects(assert, getOrder(buyer, 'ORD-1003'), [403, 404]); // belongs to BUY-1002
  await rejects(assert, getOrder(supplier, 'ORD-1003'), [403, 404]); // belongs to SUP-2002
  await rejects(assert, listMessages(buyer, 'ORD-1003'), [403, 404]);
  await rejects(assert, sendMessage(supplier, { orderId: 'ORD-1003', body: 'hello' }), [403, 404]);
  const mine = await listOrders(buyer2, { pageSize: 100 });
  assert.ok(mine.items.every((o) => ['ORD-1003', 'ORD-1008', 'ORD-1019'].includes(o.id)));
});

test('ownership: supplier can only manage own products; buyer cannot manage products', async () => {
  await rejects(assert, updateProduct(supplier, 'PRD-3005', { pricePerUnit: 1 }), [403, 404]);
  await rejects(assert, deleteProduct(supplier, 'PRD-3005'), [403, 404]);
  await rejects(assert, createProduct(buyer, { name: 'X' }), [403]);
  await rejects(assert, updateProduct(buyer, 'PRD-3001', { pricePerUnit: 1 }), [403]);
  const list = await listProducts(supplier, { pageSize: 100 });
  assert.ok(list.items.every((p) => p.supplierRef === 'SUP-2001'));
  const updated = await updateProduct(supplier, 'PRD-3001', { availableQuantity: 500 });
  assert.equal(updated.availableQuantity, 500);
});

test('supplier cannot spoof supplierId when creating a product', async () => {
  const p = await createProduct(supplier, { name: 'Test Seed', category: 'Seeds', unit: 'Bag', pricePerUnit: 100, availableQuantity: 50, supplierId: 'SUP-2002' });
  assert.equal(p.supplierRef, 'SUP-2001');
  assert.equal(loadDb().products.find((x) => x.id === p.id).supplierId, 'SUP-2001');
});

test('buyer cannot change order status of others or supplier-only transitions', async () => {
  await rejects(assert, updateOrder(buyer, 'ORD-1003', { status: 'Cancelled' }), [403, 404]);
  await rejects(assert, updateOrder(buyer, 'ORD-1009', { status: 'Dispatched' }), [409]);
  await rejects(assert, updateOrder(supplier, 'ORD-1016', { status: 'Completed' }), [409]);
  await rejects(assert, updateOrder(supplier2, 'ORD-1009', { status: 'Dispatched' }), [403, 404]);
});

test('messages cannot exchange phone numbers, emails or links', async () => {
  for (const body of ['call me on 0300 1234567', 'mail a@b.com', 'visit www.example.com', 'WhatsApp me', '+92 300 1112233']) {
    await rejects(assert, sendMessage(buyer, { orderId: 'ORD-1013', body }), [422]);
  }
  const ok = await sendMessage(buyer, { orderId: 'ORD-1013', body: 'Delivery by 2026-11-20 for 15 bags please.' });
  assert.equal(ok.fromMe, true);
  await rejects(assert, createRequest(buyer, { productId: 'PRD-3001', quantity: 10, deliveryLocation: 'Lahore', requirements: 'phone 03001234567' }), [422]);
});

test('admin cannot post messages and unauthenticated access is refused', async () => {
  await rejects(assert, sendMessage(admin, { orderId: 'ORD-1013', body: 'hi' }), [403]);
  await rejects(assert, listOrders(null), [401]);
  await rejects(assert, listProducts(undefined), [401]);
});

test('login: passwords are hashed and inactive accounts are blocked', async () => {
  const db = loadDb();
  assert.ok(db.users.every((u) => u.passwordHash.startsWith('scrypt$') && !['Admin123', 'Buyer123', 'Supplier123'].includes(u.passwordHash)));
  const r = await login('buyer@agriconnect.com', 'Buyer123');
  assert.equal(r.user.role, 'buyer');
  assert.equal(r.user.passwordHash, undefined);
  await rejects(assert, login('buyer@agriconnect.com', 'wrong'), [401]);
  await rejects(assert, login('nobody@x.com', 'Buyer123'), [401]);
});
