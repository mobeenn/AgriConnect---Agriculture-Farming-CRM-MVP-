// Buyer & Supplier management (shared implementation, configured per kind).
import { readDb, mutate } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';
import { requireRole, requireActor } from '../lib/authz.js';
import { conflict, notFound, forbidden } from '../lib/errors.js';
import { validate } from '../lib/validation.js';
import { nextId } from '../lib/ids.js';
import { serializeParty, serializeOrder, serializeProduct, serializeUser } from '../lib/privacy.js';
import { TERMINAL_STATUSES } from '../lib/workflow.js';
import { paginate, sortBy, matches, nowIso, logActivity } from './common.js';

export const BUYER_TYPES = ['Retail Chain', 'Commercial Farm', 'Feed Mill', 'Dairy Cooperative', 'Agri Retailer', 'Orchard', 'Growers Association', 'Poultry Farm', 'Other'];
export const SUPPLIER_CATEGORIES = ['Seeds', 'Fertilizers', 'Pesticides', 'Agricultural Machinery', 'Irrigation Equipment', 'Grains & Crops', 'Fruits & Vegetables', 'Animal Feed'];
const STATUSES = ['Active', 'Inactive', 'Suspended'];

const CFG = {
  buyer: { collection: 'buyers', prefix: 'BUY', start: 1001, typeField: 'businessType', types: BUYER_TYPES, role: 'buyer', label: 'Buyer', defaultPassword: 'Buyer123' },
  supplier: { collection: 'suppliers', prefix: 'SUP', start: 2001, typeField: 'supplierCategory', types: SUPPLIER_CATEGORIES, role: 'supplier', label: 'Supplier', defaultPassword: 'Supplier123' },
};

function schema(cfg) {
  return {
    businessName: { type: 'string', required: true, minLen: 2, maxLen: 100, label: 'Business name' },
    contactPerson: { type: 'string', required: true, minLen: 2, maxLen: 80, label: 'Contact person' },
    email: { type: 'email', required: true, label: 'Email' },
    phone: { type: 'phone', required: true, label: 'Phone' },
    location: { type: 'string', required: true, maxLen: 80, label: 'Location' },
    [cfg.typeField]: { type: 'enum', values: cfg.types, required: true, label: cfg.typeField === 'businessType' ? 'Business type' : 'Supplier category' },
    status: { type: 'enum', values: STATUSES, default: 'Active', label: 'Account status' },
  };
}
const SELF_FIELDS = ['businessName', 'contactPerson', 'phone', 'location'];

export async function listParties(actor, kind, q = {}) {
  requireRole(actor, 'admin');
  const cfg = CFG[kind];
  const db = readDb();
  let list = db[cfg.collection];
  if (q.search) list = list.filter((p) => [p.id, p.businessName, p.contactPerson, p.email, p.location].some((f) => matches(f, q.search)));
  if (q.status) list = list.filter((p) => p.status === q.status);
  if (q.location) list = list.filter((p) => p.location === q.location);
  if (q.type) list = list.filter((p) => p[cfg.typeField] === q.type);
  list = sortBy(list, q.sort || 'id', q.dir || 'asc');
  const { items, meta } = paginate(list, q);
  return { items: items.map((p) => serializeParty(p, kind)), meta };
}

export async function getParty(actor, kind, id) {
  requireRole(actor, 'admin');
  const cfg = CFG[kind];
  const db = readDb();
  const p = db[cfg.collection].find((x) => x.id === id);
  if (!p) throw notFound(`${cfg.label} not found`);
  const orders = db.orders.filter((o) => (kind === 'buyer' ? o.buyerId : o.supplierId) === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((o) => serializeOrder(o, 'admin', db));
  const activities = db.activities.filter((a) => (a.parties || []).includes(id) || a.actorRef === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20)
    .map((a) => ({ id: a.id, action: a.action, message: a.message, createdAt: a.createdAt }));
  const out = { ...serializeParty(p, kind), orders, activities };
  if (kind === 'supplier') out.products = db.products.filter((x) => x.supplierId === id).map((x) => serializeProduct(x, 'admin', db));
  return out;
}

export async function createParty(actor, kind, input) {
  requireRole(actor, 'admin');
  const cfg = CFG[kind];
  const clean = validate(input, { ...schema(cfg), password: { type: 'string', minLen: 8, maxLen: 64, label: 'Initial password' } });
  return mutate((db) => {
    if (db.users.some((u) => u.email === clean.email)) throw conflict('A user with this email already exists');
    const id = nextId(db, cfg.collection, cfg.prefix, cfg.start);
    const record = { id, ...clean, registrationDate: nowIso().slice(0, 10) };
    delete record.password;
    db[cfg.collection].push(record);
    db.users.push({
      id: `USR-${id}`, email: clean.email, passwordHash: hashPassword(clean.password || cfg.defaultPassword),
      role: cfg.role, refId: id, status: clean.status, createdAt: nowIso(),
    });
    logActivity(db, actor, `${kind}.create`, id, `${cfg.label} ${id} was added by an administrator`);
    return serializeParty(record, kind);
  });
}

export async function updateParty(actor, kind, id, input) {
  requireActor(actor);
  const cfg = CFG[kind];
  const isAdmin = actor.role === 'admin';
  const isSelf = actor.role === cfg.role && actor.refId === id;
  if (!isAdmin && !isSelf) throw (actor.role === cfg.role ? notFound(`${cfg.label} not found`) : forbidden());
  const full = schema(cfg);
  const allowed = isAdmin ? full : Object.fromEntries(Object.entries(full).filter(([k]) => SELF_FIELDS.includes(k)));
  const clean = validate(input, allowed, { partial: true });
  return mutate((db) => {
    const p = db[cfg.collection].find((x) => x.id === id);
    if (!p) throw notFound(`${cfg.label} not found`);
    const user = db.users.find((u) => u.role === cfg.role && u.refId === id);
    if (clean.email && clean.email !== p.email) {
      if (db.users.some((u) => u.email === clean.email && u.id !== user?.id)) throw conflict('A user with this email already exists');
      if (user) user.email = clean.email;
    }
    Object.assign(p, clean);
    if (clean.status && user) user.status = clean.status;
    logActivity(db, actor, `${kind}.update`, id, `${cfg.label} profile ${id} was updated`);
    return serializeParty(p, kind);
  });
}

export async function deleteParty(actor, kind, id) {
  requireRole(actor, 'admin');
  const cfg = CFG[kind];
  return mutate((db) => {
    const p = db[cfg.collection].find((x) => x.id === id);
    if (!p) throw notFound(`${cfg.label} not found`);
    const open = db.orders.filter((o) => (kind === 'buyer' ? o.buyerId : o.supplierId) === id && !TERMINAL_STATUSES.includes(o.status));
    if (open.length) throw conflict(`${cfg.label} has ${open.length} open order(s). Complete or cancel them before deleting.`);
    const user = db.users.find((u) => u.role === cfg.role && u.refId === id);
    db[cfg.collection] = db[cfg.collection].filter((x) => x.id !== id);
    db.users = db.users.filter((u) => u !== user);
    if (user) db.notifications = db.notifications.filter((n) => n.userId !== user.id);
    if (kind === 'supplier') db.products = db.products.filter((x) => x.supplierId !== id);
    logActivity(db, actor, `${kind}.delete`, id, `${cfg.label} ${id} was removed by an administrator`);
    return { id, deleted: true };
  });
}

// The signed-in user's own profile.
export async function getProfile(actor) {
  requireActor(actor);
  const db = readDb();
  if (actor.role === 'admin') return { ...serializeUser(db.users.find((u) => u.id === actor.userId)), name: actor.name };
  const cfg = CFG[actor.role];
  const p = db[cfg.collection].find((x) => x.id === actor.refId);
  if (!p) throw notFound('Profile not found');
  return serializeParty(p, actor.role);
}
export async function updateProfile(actor, input) {
  requireRole(actor, 'buyer', 'supplier');
  return updateParty(actor, actor.role, actor.refId, input);
}
