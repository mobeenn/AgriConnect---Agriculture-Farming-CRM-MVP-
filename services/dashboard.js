import { readDb } from '../lib/db.js';
import { requireActor, scopeOrders } from '../lib/authz.js';
import { serializeOrder, serializeRequest, serializeActivity, serializeProduct } from '../lib/privacy.js';
import { ORDER_STATUSES, ORDER_STAGE_STATUSES } from '../lib/workflow.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const sum = (list, f) => list.reduce((s, x) => s + (f(x) || 0), 0);
const OPEN_REQUEST = ['Pending', 'Quotation Submitted'];

function lastSixMonths(anchorIso) {
  const a = new Date(anchorIso);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() - (5 - i), 1));
    return { key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, label: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}` };
  });
}

export async function getDashboard(actor) {
  requireActor(actor);
  const db = readDb();
  const { role } = actor;
  const orders = scopeOrders(db, actor);
  const requests = role === 'admin' ? db.purchaseRequests : db.purchaseRequests.filter((r) => (role === 'buyer' ? r.buyerId : r.supplierId) === actor.refId);
  const products = role === 'supplier' ? db.products.filter((p) => p.supplierId === actor.refId) : db.products;
  const fulfilled = orders.filter((o) => ORDER_STAGE_STATUSES.includes(o.status));
  const lowStock = role === 'buyer' ? [] : products.filter((p) => p.availableQuantity <= p.lowStockThreshold);
  const unread = db.notifications.filter((n) => n.userId === actor.userId && !n.read).length;

  let stats;
  if (role === 'admin') {
    stats = [
      { key: 'buyers', label: 'Total buyers', value: db.buyers.length },
      { key: 'suppliers', label: 'Total suppliers', value: db.suppliers.length },
      { key: 'products', label: 'Total products', value: db.products.length, hint: `${lowStock.length} low on stock` },
      { key: 'orders', label: 'Total orders', value: orders.length },
      { key: 'pending', label: 'Pending orders', value: orders.filter((o) => OPEN_REQUEST.includes(o.status)).length },
      { key: 'completed', label: 'Completed orders', value: orders.filter((o) => o.status === 'Completed').length },
      { key: 'requests', label: 'Purchase requests', value: requests.length },
      { key: 'gmv', label: 'Order value', value: sum(fulfilled, (o) => o.totalPrice), format: 'currency' },
    ];
  } else if (role === 'buyer') {
    stats = [
      { key: 'requests', label: 'My purchase requests', value: requests.length },
      { key: 'open', label: 'Awaiting quotation', value: orders.filter((o) => OPEN_REQUEST.includes(o.status)).length },
      { key: 'active', label: 'Orders in progress', value: orders.filter((o) => ['Accepted', 'Processing', 'Dispatched', 'Delivered'].includes(o.status)).length },
      { key: 'completed', label: 'Completed orders', value: orders.filter((o) => o.status === 'Completed').length },
      { key: 'spend', label: 'Total spend', value: sum(fulfilled, (o) => o.totalPrice), format: 'currency' },
      { key: 'unread', label: 'Unread notifications', value: unread },
    ];
  } else {
    stats = [
      { key: 'products', label: 'My products', value: products.length },
      { key: 'low', label: 'Low-stock products', value: lowStock.length },
      { key: 'incoming', label: 'Incoming requests', value: orders.filter((o) => o.status === 'Pending').length, hint: 'Waiting for your quotation' },
      { key: 'active', label: 'Orders to fulfil', value: orders.filter((o) => ['Accepted', 'Processing', 'Dispatched'].includes(o.status)).length },
      { key: 'completed', label: 'Completed orders', value: orders.filter((o) => o.status === 'Completed').length },
      { key: 'revenue', label: 'Total sales', value: sum(fulfilled, (o) => o.totalPrice), format: 'currency' },
    ];
  }

  const anchor = [...db.orders].map((o) => o.createdAt).sort().pop() || new Date().toISOString();
  const months = lastSixMonths(anchor);
  const monthlyOrders = months.map((m) => {
    const inMonth = orders.filter((o) => o.createdAt.startsWith(m.key));
    return { month: m.label, orders: inMonth.length, value: sum(inMonth.filter((o) => ORDER_STAGE_STATUSES.includes(o.status)), (o) => o.totalPrice) };
  });
  const requestsOverview = months.map((m) => {
    const inMonth = requests.filter((r) => r.createdAt.startsWith(m.key));
    return { month: m.label, requests: inMonth.length, converted: inMonth.filter((r) => ORDER_STAGE_STATUSES.includes(r.status)).length };
  });
  const catCount = {};
  if (role === 'buyer') orders.forEach((o) => { catCount[o.category] = (catCount[o.category] || 0) + 1; });
  else products.forEach((p) => { catCount[p.category] = (catCount[p.category] || 0) + 1; });
  const categoryDistribution = Object.entries(catCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const orderStatus = ORDER_STATUSES.map((s) => ({ name: s, value: orders.filter((o) => o.status === s).length })).filter((x) => x.value > 0);

  const byDate = (a, b) => b.createdAt.localeCompare(a.createdAt);
  const activities = db.activities.filter((a) => role === 'admin' || (a.parties || []).includes(actor.refId)).sort(byDate).slice(0, 8);

  return {
    role, stats,
    charts: { monthlyOrders, requestsOverview, categoryDistribution, orderStatus },
    recentOrders: [...orders].sort(byDate).slice(0, 6).map((o) => serializeOrder(o, role, db)),
    recentRequests: [...requests].filter((r) => OPEN_REQUEST.includes(r.status)).sort(byDate).slice(0, 5).map((r) => serializeRequest(r, role, db)),
    recentActivities: activities.map((a) => serializeActivity(a, role)),
    lowStockProducts: lowStock.slice(0, 5).map((p) => serializeProduct(p, role, db)),
  };
}
