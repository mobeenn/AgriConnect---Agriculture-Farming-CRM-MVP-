// Runs the REAL route handlers (app/api/**/route.js) with a cookie session.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetDb, assertNoLeak } from './helpers.js';

const route = async (p) => import(`../app/api/${p}/route.js`);
const req = (url, method = 'GET', body) => new Request(`http://localhost${url}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } });
const json = async (res) => ({ status: res.status, ...(await res.json()) });
const signOut = () => { globalThis.__testCookies = {}; };
async function signIn(email, password) {
  signOut();
  const res = await (await route('auth/login')).POST(req('/api/auth/login', 'POST', { email, password }));
  const cookie = res.headers.get('set-cookie');
  if (res.status === 200) globalThis.__testCookies = { agri_session: cookie.split('=')[1] };
  return { res, cookie };
}
const call = async (p, method, url, body, params) => json(await (await route(p))[method](req(url, method, body), { params }));

beforeEach(() => { resetDb(); signOut(); });

test('login sets a signed session cookie; wrong password gives 401; /me needs a session', async () => {
  assert.equal((await call('auth/me', 'GET', '/api/auth/me')).status, 401);
  assert.equal((await signIn('buyer@agriconnect.com', 'nope')).res.status, 401);
  const { res } = await signIn('buyer@agriconnect.com', 'Buyer123');
  assert.equal(res.status, 200);
  const me = await call('auth/me', 'GET', '/api/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.data.role, 'buyer');
  assert.equal(me.data.passwordHash, undefined);
});

test('forged or tampered cookies are rejected', async () => {
  globalThis.__testCookies = { agri_session: Buffer.from('{"uid":"USR-0001","exp":9999999999999}').toString('base64url') + '.AAAA' };
  assert.equal((await call('dashboard', 'GET', '/api/dashboard')).status, 401);
});

test('every protected endpoint returns 401 without a session', async () => {
  for (const p of ['dashboard', 'buyers', 'suppliers', 'products', 'orders', 'purchase-requests', 'quotations', 'messages', 'notifications', 'profile', 'categories', 'settings']) {
    assert.equal((await call(p, 'GET', `/api/${p}`)).status, 401, p);
  }
});

test('buyer over HTTP: sees products with supplier refs only, blocked from admin endpoints', async () => {
  await signIn('buyer@agriconnect.com', 'Buyer123');
  const products = await call('products', 'GET', '/api/products?pageSize=50');
  assert.equal(products.status, 200);
  assert.ok(products.data.length > 0 && products.data.every((p) => /^SUP-/.test(p.supplierRef)));
  assertNoLeak(assert, products, 'supplier', 'GET /api/products');
  for (const p of ['orders', 'purchase-requests', 'quotations', 'notifications', 'messages']) assertNoLeak(assert, await call(p, 'GET', `/api/${p}?pageSize=50`), 'supplier', p);
  assertNoLeak(assert, await call('dashboard', 'GET', '/api/dashboard'), 'supplier', 'dashboard');
  assert.equal((await call('buyers', 'GET', '/api/buyers')).status, 403);
  assert.equal((await call('suppliers', 'GET', '/api/suppliers')).status, 403);
  assert.equal((await call('suppliers/[id]', 'GET', '/api/suppliers/SUP-2001', undefined, { id: 'SUP-2001' })).status, 403);
  assert.equal((await call('settings', 'GET', '/api/settings')).status, 403);
  assert.equal((await call('orders/[id]', 'GET', '/api/orders/ORD-1003', undefined, { id: 'ORD-1003' })).status, 404);
  assert.equal((await call('products', 'POST', '/api/products', { name: 'x' })).status, 403);
});

test('supplier over HTTP: sees buyer refs only; can manage only own products', async () => {
  await signIn('supplier@agriconnect.com', 'Supplier123');
  for (const p of ['orders', 'purchase-requests', 'quotations', 'notifications', 'messages', 'products']) assertNoLeak(assert, await call(p, 'GET', `/api/${p}?pageSize=50`), 'buyer', p);
  assert.equal((await call('products/[id]', 'PUT', '/api/products/PRD-3005', { pricePerUnit: 1 }, { id: 'PRD-3005' })).status, 404);
  assert.equal((await call('products/[id]', 'PUT', '/api/products/PRD-3001', { availableQuantity: 410 }, { id: 'PRD-3001' })).status, 200);
  assert.equal((await call('buyers', 'GET', '/api/buyers')).status, 403);
});

test('admin over HTTP: full access incl. identities; CRUD persists to the database file', async () => {
  await signIn('admin@agriconnect.com', 'Admin123');
  const buyers = await call('buyers', 'GET', '/api/buyers?search=green');
  assert.equal(buyers.status, 200);
  assert.equal(buyers.data[0].email, 'buyer@agriconnect.com');
  const created = await call('suppliers', 'POST', '/api/suppliers', { businessName: 'New Agro Supplies', contactPerson: 'Ali Khan', email: 'ali@newagro.pk', phone: '+92 300 1234567', location: 'Lahore', supplierCategory: 'Seeds' });
  assert.equal(created.status, 201);
  assert.equal(created.data.id, 'SUP-2011');
  assert.equal((await call('suppliers', 'POST', '/api/suppliers', { businessName: 'x' })).status, 422);
  const fresh = JSON.parse((await import('node:fs')).readFileSync(process.env.DB_PATH, 'utf8'));
  assert.ok(fresh.suppliers.some((s) => s.id === 'SUP-2011'));
  assert.equal((await call('suppliers/[id]', 'DELETE', '/api/suppliers/SUP-2011', undefined, { id: 'SUP-2011' })).status, 200);
  assert.equal((await call('suppliers/[id]', 'GET', '/api/suppliers/SUP-2011', undefined, { id: 'SUP-2011' })).status, 404);
  const order = await call('orders/[id]', 'GET', '/api/orders/ORD-1013', undefined, { id: 'ORD-1013' });
  assert.equal(order.data.supplierName, 'Fertile Fields Seeds Co.');
});

test('end-to-end over HTTP: request -> quote -> accept -> process -> deliver -> complete', async () => {
  await signIn('buyer@agriconnect.com', 'Buyer123');
  const created = await call('purchase-requests', 'POST', '/api/purchase-requests', { productId: 'PRD-3002', quantity: 30, deliveryLocation: 'Lahore Cantt', requirements: 'Treated seed' });
  assert.equal(created.status, 201);
  const id = created.data.order.id;
  assert.equal((await call('purchase-requests', 'POST', '/api/purchase-requests', { productId: 'PRD-3002', quantity: 30, deliveryLocation: 'Lahore', requirements: 'call 03001234567' })).status, 422);

  await signIn('supplier@agriconnect.com', 'Supplier123');
  const q = await call('quotations', 'POST', '/api/quotations', { orderId: id, unitPrice: 6100, deliveryDays: 4 });
  assert.equal(q.status, 201);

  await signIn('buyer@agriconnect.com', 'Buyer123');
  assert.equal((await call('quotations/[id]', 'PUT', `/api/quotations/${q.data.id}`, { action: 'accept' }, { id: q.data.id })).status, 200);

  await signIn('supplier@agriconnect.com', 'Supplier123');
  for (const status of ['Processing', 'Dispatched', 'Delivered']) assert.equal((await call('orders/[id]', 'PUT', `/api/orders/${id}`, { status }, { id })).status, 200);
  assert.equal((await call('orders/[id]', 'PUT', `/api/orders/${id}`, { status: 'Completed' }, { id })).status, 409);

  await signIn('buyer@agriconnect.com', 'Buyer123');
  const done = await call('orders/[id]', 'PUT', `/api/orders/${id}`, { status: 'Completed' }, { id });
  assert.equal(done.data.status, 'Completed');
  assertNoLeak(assert, done, 'supplier', 'completed order');
  const n = await call('notifications', 'GET', '/api/notifications?unread=true');
  assert.ok(n.meta.unreadCount > 0);
});

test('logout clears the cookie', async () => {
  await signIn('buyer@agriconnect.com', 'Buyer123');
  const res = await (await route('auth/logout')).POST();
  assert.match(res.headers.get('set-cookie'), /agri_session=;?/);
});

test('malformed JSON body gives 400 and unknown route params give 404', async () => {
  await signIn('admin@agriconnect.com', 'Admin123');
  const bad = await (await route('buyers')).POST(new Request('http://localhost/api/buyers', { method: 'POST', body: '{oops' }));
  assert.equal(bad.status, 400);
  assert.equal((await call('buyers/[id]', 'GET', '/api/buyers/BUY-9999', undefined, { id: 'BUY-9999' })).status, 404);
});
