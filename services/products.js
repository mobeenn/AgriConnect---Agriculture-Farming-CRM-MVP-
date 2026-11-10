import { readDb, mutate } from '../lib/db.js';
import { requireActor, requireRole, canManageProduct } from '../lib/authz.js';
import { notFound, conflict, invalid } from '../lib/errors.js';
import { validate } from '../lib/validation.js';
import { nextId } from '../lib/ids.js';
import { serializeProduct } from '../lib/privacy.js';
import { TERMINAL_STATUSES } from '../lib/workflow.js';
import { paginate, sortBy, matches, nowIso, logActivity } from './common.js';
import { checkLowStock, deriveAvailability } from './inventory.js';

export const UNITS = ['KG', 'Ton', 'Bag', 'Liter', 'Piece'];
const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const baseSchema = (categories) => ({
  name: { type: 'string', required: true, minLen: 2, maxLen: 100, label: 'Product name' },
  category: { type: 'enum', values: categories, required: true, label: 'Category' },
  description: { type: 'string', maxLen: 1000, label: 'Description', default: '' },
  unit: { type: 'enum', values: UNITS, required: true, label: 'Unit' },
  pricePerUnit: { type: 'number', required: true, min: 0.01, max: 1e9, label: 'Price per unit' },
  availableQuantity: { type: 'number', required: true, min: 0, max: 1e9, label: 'Available quantity' },
  minOrderQuantity: { type: 'number', min: 1, max: 1e9, default: 1, label: 'Minimum order quantity' },
  lowStockThreshold: { type: 'number', min: 0, max: 1e9, label: 'Low-stock threshold' },
  image: { type: 'string', maxLen: 300, label: 'Image URL' },
  availability: { type: 'enum', values: ['Available', 'Unavailable'], default: 'Available', label: 'Availability' },
});

function checkImage(image) {
  if (image && !(image.startsWith('/') || image.startsWith('https://'))) throw invalid({ image: 'Image must be a /local/path or an https:// URL' });
}

export async function listProducts(actor, q = {}) {
  requireActor(actor);
  const db = readDb();
  let list = db.products;
  if (actor.role === 'supplier') list = list.filter((p) => p.supplierId === actor.refId);
  if (actor.role === 'buyer') {
    const activeSuppliers = new Set(db.suppliers.filter((s) => s.status === 'Active').map((s) => s.id));
    list = list.filter((p) => p.availability !== 'Unavailable' && activeSuppliers.has(p.supplierId));
  }
  if (actor.role === 'admin' && q.supplierId) list = list.filter((p) => p.supplierId === q.supplierId);
  if (q.search) list = list.filter((p) => [p.name, p.id, p.description].some((f) => matches(f, q.search)));
  if (q.category) list = list.filter((p) => p.category === q.category);
  if (q.minPrice) list = list.filter((p) => p.pricePerUnit >= Number(q.minPrice));
  if (q.maxPrice) list = list.filter((p) => p.pricePerUnit <= Number(q.maxPrice));
  if (q.availability) list = list.filter((p) => p.availability === q.availability);
  if (q.lowStock === 'true' && actor.role !== 'buyer') list = list.filter((p) => p.availableQuantity <= p.lowStockThreshold);
  const sortKey = { name: 'name', price: 'pricePerUnit', quantity: 'availableQuantity', created: 'createdAt' }[q.sort] || 'name';
  list = sortBy(list, sortKey, q.dir || 'asc');
  const { items, meta } = paginate(list, q);
  const lowStockCount = actor.role === 'buyer' ? undefined
    : (actor.role === 'admin' ? db.products : db.products.filter((p) => p.supplierId === actor.refId)).filter((p) => p.availableQuantity <= p.lowStockThreshold).length;
  return { items: items.map((p) => serializeProduct(p, actor.role, db)), meta: { ...meta, lowStockCount } };
}

export async function getProduct(actor, id) {
  requireActor(actor);
  const db = readDb();
  const p = db.products.find((x) => x.id === id);
  if (!p || (actor.role === 'supplier' && p.supplierId !== actor.refId) || (actor.role === 'buyer' && p.availability === 'Unavailable')) throw notFound('Product not found');
  return serializeProduct(p, actor.role, db);
}

export async function createProduct(actor, input) {
  requireRole(actor, 'supplier', 'admin');
  return mutate((db) => {
    const clean = validate(input, baseSchema(db.categories.map((c) => c.name)));
    checkImage(clean.image);
    let supplierId = actor.refId;
    if (actor.role === 'admin') {
      supplierId = String(input?.supplierId || '');
      if (!db.suppliers.some((s) => s.id === supplierId)) throw invalid({ supplierId: 'Select a valid supplier' });
    }
    const id = nextId(db, 'products', 'PRD', 3001);
    const product = {
      id, supplierId, ...clean,
      image: clean.image || `/images/categories/${slug(clean.category)}.svg`,
      lowStockThreshold: clean.lowStockThreshold ?? db.settings.lowStockDefault,
      createdAt: nowIso(), updatedAt: nowIso(),
    };
    product.availability = deriveAvailability(product.availableQuantity, product.availability);
    db.products.push(product);
    checkLowStock(db, product);
    logActivity(db, actor, 'product.create', id, `Product ${id} was listed by ${supplierId}`);
    return serializeProduct(product, actor.role, db);
  });
}

export async function updateProduct(actor, id, input) {
  requireRole(actor, 'supplier', 'admin');
  return mutate((db) => {
    const p = db.products.find((x) => x.id === id);
    if (!p || !canManageProduct(actor, p)) throw notFound('Product not found'); // foreign product: reveal nothing
    const clean = validate(input, baseSchema(db.categories.map((c) => c.name)), { partial: true });
    checkImage(clean.image);
    const before = p.availableQuantity;
    Object.assign(p, clean);
    p.availability = deriveAvailability(p.availableQuantity, clean.availability || p.availability);
    p.updatedAt = nowIso();
    checkLowStock(db, p, before);
    logActivity(db, actor, 'product.update', id, `Product ${id} was updated`);
    return serializeProduct(p, actor.role, db);
  });
}

export async function deleteProduct(actor, id) {
  requireRole(actor, 'supplier', 'admin');
  return mutate((db) => {
    const p = db.products.find((x) => x.id === id);
    if (!p || !canManageProduct(actor, p)) throw notFound('Product not found');
    const open = db.orders.filter((o) => o.productId === id && !TERMINAL_STATUSES.includes(o.status));
    if (open.length) throw conflict(`This product has ${open.length} open order(s). Finish them or mark the product as Unavailable instead.`);
    db.products = db.products.filter((x) => x.id !== id);
    logActivity(db, actor, 'product.delete', id, `Product ${id} was removed`);
    return { id, deleted: true };
  });
}
