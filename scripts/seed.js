// Generates db.json with realistic dummy data. Run: npm run reset-db
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../lib/auth.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = new Date('2026-11-09T09:00:00Z').getTime();
const ago = (days, hours = 0) => new Date(BASE - days * 864e5 + hours * 36e5).toISOString();
const slug = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const categories = [
  ['Seeds', 'sprout'], ['Fertilizers', 'flask'], ['Pesticides', 'shield'], ['Agricultural Machinery', 'tractor'],
  ['Irrigation Equipment', 'droplets'], ['Grains & Crops', 'wheat'], ['Fruits & Vegetables', 'apple'], ['Animal Feed', 'beef'],
].map(([name, icon], i) => ({ id: `CAT-${i + 1}`, name, icon, image: `/images/categories/${slug(name)}.svg` }));

// ---- buyers ----------------------------------------------------------
const B = [
  ['Green Valley Agro Mart', 'Ahmed Raza', 'buyer@agriconnect.com', '+92 300 1112233', 'Lahore', 'Retail Chain', '2024-02-11'],
  ['Al-Madina Farms', 'Usman Tariq', 'procurement@almadinafarms.pk', '+92 301 2223344', 'Multan', 'Commercial Farm', '2024-03-02'],
  ['Rehman Feed Mill', 'Bilal Rehman', 'purchasing@rehmanfeed.pk', '+92 302 3334455', 'Faisalabad', 'Feed Mill', '2024-04-19'],
  ['Sahiwal Dairy Cooperative', 'Imran Gill', 'office@sahiwaldairy.pk', '+92 303 4445566', 'Sahiwal', 'Dairy Cooperative', '2024-05-07'],
  ['Capital Agri Retail', 'Sana Khalid', 'orders@capitalagri.pk', '+92 304 5556677', 'Islamabad', 'Agri Retailer', '2024-06-23'],
  ['Pindi Orchards', 'Farhan Malik', 'manager@pindiorchards.pk', '+92 305 6667788', 'Rawalpindi', 'Orchard', '2024-08-14'],
  ['Bahawalpur Cotton Growers Association', 'Haider Abbas', 'secretary@bwpcotton.pk', '+92 306 7778899', 'Bahawalpur', 'Growers Association', '2024-09-30'],
  ['Gujranwala Poultry Group', 'Nadia Farooq', 'supply@gjwpoultry.pk', '+92 307 8889900', 'Gujranwala', 'Poultry Farm', '2024-11-12'],
];
const buyers = B.map(([businessName, contactPerson, email, phone, location, businessType, registrationDate], i) => ({
  id: `BUY-${1001 + i}`, businessName, contactPerson, email, phone, location, businessType, registrationDate, status: i === 7 ? 'Inactive' : 'Active',
}));
buyers[7].status = 'Active';

// ---- suppliers -------------------------------------------------------
const S = [
  ['Fertile Fields Seeds Co.', 'Khurram Shahzad', 'supplier@agriconnect.com', '+92 321 1100221', 'Lahore', 'Seeds', '2023-11-05'],
  ['Sarsabz Fertilizer Depot', 'Waqar Ahmed', 'sales@sarsabzfert.pk', '+92 322 2200332', 'Multan', 'Fertilizers', '2023-12-18'],
  ['Kisan Crop Care', 'Tahir Mehmood', 'info@kisancropcare.pk', '+92 323 3300443', 'Faisalabad', 'Pesticides', '2024-01-09'],
  ['Allied Tractor & Implements', 'Rashid Butt', 'sales@alliedtractor.pk', '+92 324 4400554', 'Gujranwala', 'Agricultural Machinery', '2024-01-25'],
  ['Indus Drip Irrigation Systems', 'Zainab Iqbal', 'contact@indusdrip.pk', '+92 325 5500665', 'Bahawalpur', 'Irrigation Equipment', '2024-02-14'],
  ['Sahiwal Grain Merchants', 'Mehboob Ali', 'trade@sahiwalgrain.pk', '+92 326 6600776', 'Sahiwal', 'Grains & Crops', '2024-03-30'],
  ['Multan Mango & Citrus Growers', 'Asif Qureshi', 'export@multanmango.pk', '+92 327 7700887', 'Multan', 'Fruits & Vegetables', '2024-04-02'],
  ['Rawalpindi Feed Industries', 'Shahid Mirza', 'sales@pindifeed.pk', '+92 328 8800998', 'Rawalpindi', 'Animal Feed', '2024-05-21'],
  ['Zameendar Seeds & Agro', 'Fatima Noor', 'hello@zameendarseeds.pk', '+92 329 9900109', 'Islamabad', 'Seeds', '2024-07-08'],
  ['Chenab Agro Chemicals', 'Adnan Cheema', 'orders@chenabagro.pk', '+92 330 1010210', 'Gujranwala', 'Pesticides', '2024-08-27'],
];
const suppliers = S.map(([businessName, contactPerson, email, phone, location, supplierCategory, registrationDate], i) => ({
  id: `SUP-${2001 + i}`, businessName, contactPerson, email, phone, location, supplierCategory, registrationDate, status: 'Active',
}));

// ---- products: [name, category, unit, price, qty, moq, supplierId, threshold, description] ----
const P = [
  ['Hybrid Maize Seed (8 kg pack)', 'Seeds', 'Bag', 14500, 400, 10, 2001, 60, 'High-yield hybrid maize, 98% germination, suited to spring and autumn sowing in Punjab.'],
  ['Wheat Seed Faisalabad-2008', 'Seeds', 'Bag', 6200, 850, 20, 2001, 100, 'Certified 40 kg bags, rust tolerant, treated against seed-borne disease.'],
  ['Super Kernel Basmati Rice Seed', 'Seeds', 'Bag', 9800, 90, 5, 2001, 100, 'Premium long-grain basmati seed, certified purity 99%.'],
  ['Bt Cotton Seed (450 g)', 'Seeds', 'Bag', 11200, 300, 10, 2009, 50, 'Bt cotton variety with CLCuV tolerance and strong boll retention.'],
  ['Urea Fertilizer (50 kg)', 'Fertilizers', 'Bag', 4650, 2400, 20, 2002, 300, 'Granular urea, 46% nitrogen. Free flowing, moisture protected packaging.'],
  ['DAP Fertilizer (50 kg)', 'Fertilizers', 'Bag', 12400, 80, 10, 2002, 100, 'Di-ammonium phosphate 18-46-0 for basal application.'],
  ['SOP Potash (50 kg)', 'Fertilizers', 'Bag', 9800, 520, 10, 2002, 80, 'Sulphate of potash for fruit, vegetable and cotton crops.'],
  ['NPK 20-20-0 Compound (50 kg)', 'Fertilizers', 'Bag', 6900, 640, 10, 2002, 80, 'Balanced compound fertilizer for wheat and sugarcane.'],
  ['Imidacloprid 200SL Insecticide', 'Pesticides', 'Liter', 3200, 760, 12, 2003, 100, 'Systemic insecticide against sucking pests on cotton and vegetables.'],
  ['Glyphosate 41% Herbicide', 'Pesticides', 'Liter', 1800, 1200, 20, 2010, 150, 'Non-selective herbicide for pre-sowing weed control.'],
  ['Chlorpyrifos 40EC', 'Pesticides', 'Liter', 2400, 540, 12, 2003, 80, 'Broad-spectrum insecticide for soil and foliar pests.'],
  ['Mini Tractor 50 HP', 'Agricultural Machinery', 'Piece', 3450000, 2, 1, 2004, 3, '2WD tractor, 50 HP diesel engine, 1-year workshop warranty.'],
  ['Rotavator 7 ft', 'Agricultural Machinery', 'Piece', 285000, 14, 1, 2004, 3, 'Heavy duty rotavator for seedbed preparation.'],
  ['Seed Drill 11-Row', 'Agricultural Machinery', 'Piece', 195000, 9, 1, 2004, 3, 'Precision seed drill with fertilizer box and adjustable row spacing.'],
  ['Wheat Thresher', 'Agricultural Machinery', 'Piece', 420000, 5, 1, 2004, 2, 'High capacity thresher with cleaning fans, tractor PTO driven.'],
  ['Drip Irrigation Kit (1 acre)', 'Irrigation Equipment', 'Piece', 78000, 40, 1, 2005, 8, 'Complete drip kit: mainline, laterals, emitters and screen filter.'],
  ['Submersible Pump 5 HP', 'Irrigation Equipment', 'Piece', 62000, 25, 1, 2005, 5, 'Stainless steel submersible pump, 5 HP, copper winding.'],
  ['HDPE Pipe 63 mm (100 m roll)', 'Irrigation Equipment', 'Piece', 24500, 120, 2, 2005, 20, 'PN10 rated HDPE pipe, UV stabilised.'],
  ['Sprinkler Set (12 heads)', 'Irrigation Equipment', 'Piece', 38000, 0, 1, 2005, 5, 'Impact sprinkler set with risers and couplings.'],
  ['Wheat Grain (milling quality)', 'Grains & Crops', 'Ton', 118000, 150, 5, 2006, 20, 'Cleaned milling-grade wheat, moisture under 12%.'],
  ['Basmati Paddy', 'Grains & Crops', 'Ton', 165000, 90, 5, 2006, 15, 'Fresh basmati paddy from the Kallar belt, minimum 28% grain elongation.'],
  ['Yellow Maize Grain', 'Grains & Crops', 'Ton', 88000, 210, 10, 2006, 25, 'Dried yellow maize suitable for feed manufacturing.'],
  ['Desi Chickpeas', 'Grains & Crops', 'Ton', 285000, 35, 2, 2006, 10, 'Graded desi chickpeas, hand sorted.'],
  ['Chaunsa Mangoes (Grade A)', 'Fruits & Vegetables', 'KG', 320, 5000, 100, 2007, 500, 'Tree-ripened Chaunsa mangoes, packed in 10 kg crates.'],
  ['Kinnow Mandarin', 'Fruits & Vegetables', 'KG', 140, 8000, 200, 2007, 800, 'Sargodha-grade kinnow, graded and waxed.'],
  ['Potatoes (Table Grade)', 'Fruits & Vegetables', 'Ton', 65000, 40, 2, 2007, 8, 'Washed and graded table potatoes, 50 kg sacks.'],
  ['Onions (Red)', 'Fruits & Vegetables', 'Ton', 80000, 15, 2, 2007, 20, 'Firm red onions with good shelf life.'],
  ['Poultry Layer Feed (50 kg)', 'Animal Feed', 'Bag', 5600, 1800, 20, 2008, 200, 'Complete layer ration with calcium and amino acid balance.'],
  ['Dairy Cattle Concentrate (50 kg)', 'Animal Feed', 'Bag', 4300, 950, 20, 2008, 150, '18% protein concentrate for lactating cattle and buffalo.'],
  ['Cottonseed Cake (50 kg)', 'Animal Feed', 'Bag', 3900, 60, 20, 2008, 100, 'Expeller pressed cottonseed cake, high protein.'],
].map((r, i) => {
  const [name, category, unit, pricePerUnit, availableQuantity, minOrderQuantity, sid, lowStockThreshold, description] = r;
  return {
    id: `PRD-${3001 + i}`, supplierId: `SUP-${sid}`, name, category, description, unit, pricePerUnit, availableQuantity, minOrderQuantity,
    image: `/images/categories/${slug(category)}.svg`, availability: availableQuantity <= 0 ? 'Out of Stock' : 'Available',
    lowStockThreshold, createdAt: ago(200 - i * 3), updatedAt: ago(20 - (i % 15)),
  };
});
const prod = (n) => P[n - 3001];

// ---- orders: [buyer, product, qty, status, daysAgo, location, requirements] ----
const O = [
  [1001, 3001, 40, 'Completed', 150, 'Lahore Cantt', 'Sealed original packs only.'],
  [1001, 3003, 25, 'Completed', 120, 'Lahore Cantt', ''],
  [1002, 3005, 200, 'Completed', 110, 'Multan Road, Khanewal', 'Delivery before sowing season.'],
  [1003, 3028, 150, 'Completed', 95, 'Faisalabad Industrial Estate', ''],
  [1001, 3002, 60, 'Delivered', 20, 'Lahore Cantt', 'Treated seed preferred.'],
  [1004, 3029, 80, 'Dispatched', 14, 'Sahiwal City', ''],
  [1005, 3016, 4, 'Dispatched', 12, 'Islamabad, Sector I-9', 'Include installation guide.'],
  [1002, 3006, 120, 'Processing', 9, 'Multan Road, Khanewal', ''],
  [1001, 3001, 30, 'Processing', 8, 'Lahore Cantt', 'Split delivery in two lots.'],
  [1006, 3024, 800, 'Processing', 7, 'Rawalpindi Fruit Market', 'Crate packing, 10 kg each.'],
  [1007, 3020, 25, 'Accepted', 6, 'Bahawalpur Grain Market', ''],
  [1008, 3009, 60, 'Accepted', 5, 'Gujranwala, GT Road', ''],
  [1001, 3003, 15, 'Quotation Submitted', 4, 'Lahore Cantt', 'Need certificate of purity.'],
  [1003, 3030, 100, 'Quotation Submitted', 3, 'Faisalabad Industrial Estate', ''],
  [1005, 3013, 2, 'Quotation Submitted', 3, 'Islamabad, Sector I-9', ''],
  [1001, 3002, 50, 'Pending', 2, 'Lahore Cantt', 'Please quote for bulk rate.'],
  [1004, 3010, 40, 'Pending', 1, 'Sahiwal City', ''],
  [1006, 3026, 10, 'Pending', 1, 'Rawalpindi Fruit Market', 'Washed potatoes only.'],
  [1002, 3012, 1, 'Rejected', 30, 'Multan Road, Khanewal', ''],
  [1008, 3027, 15, 'Cancelled', 40, 'Gujranwala, GT Road', ''],
];
const PATH = ['Pending', 'Quotation Submitted', 'Accepted', 'Processing', 'Dispatched', 'Delivered', 'Completed'];
const orders = []; const purchaseRequests = []; const quotations = [];
O.forEach(([b, p, qty, status, d, loc, req], i) => {
  const pr = prod(p); const id = `ORD-${1001 + i}`; const rid = `REQ-${5001 + i}`;
  const created = ago(d);
  const steps = status === 'Rejected' || status === 'Cancelled' ? ['Pending', status] : PATH.slice(0, PATH.indexOf(status) + 1);
  const hasQuote = i < 15;
  const unitPrice = hasQuote ? Math.round(pr.pricePerUnit * (0.96 + (i % 4) * 0.01)) : null;
  const history = steps.map((s, k) => ({ status: s, at: new Date(new Date(created).getTime() + k * 36e5 * 14).toISOString(), note: k === 0 ? 'Purchase request submitted' : '' }));
  const reserved = ['Accepted', 'Processing', 'Dispatched', 'Delivered'].includes(status);
  orders.push({
    id, requestId: rid, buyerId: `BUY-${b}`, supplierId: pr.supplierId, productId: pr.id, productName: pr.name, category: pr.category, unit: pr.unit,
    quantity: qty, deliveryLocation: loc, requirements: req, status,
    quotationId: hasQuote ? `QUO-${6001 + i}` : null, unitPrice, totalPrice: hasQuote ? unitPrice * qty : null,
    deliveryInfo: ['Dispatched', 'Delivered', 'Completed'].includes(status) ? { expectedDate: ago(d - 8).slice(0, 10), carrier: 'Truck', note: 'Dispatched from supplier warehouse.' } : null,
    inventoryReserved: reserved, statusHistory: history, createdAt: created, updatedAt: history[history.length - 1].at,
  });
  purchaseRequests.push({
    id: rid, orderId: id, buyerId: `BUY-${b}`, supplierId: pr.supplierId, productId: pr.id, productName: pr.name, unit: pr.unit,
    quantity: qty, deliveryLocation: loc, requirements: req, status, createdAt: created, updatedAt: history[history.length - 1].at,
  });
  if (hasQuote) {
    quotations.push({
      id: `QUO-${6001 + i}`, orderId: id, buyerId: `BUY-${b}`, supplierId: pr.supplierId, unitPrice, totalPrice: unitPrice * qty,
      deliveryDays: 3 + (i % 6), validUntil: ago(d - 14).slice(0, 10) > '2026-12-31' ? '2026-12-31' : ago(d - 14).slice(0, 10),
      notes: i % 3 === 0 ? 'Price includes loading. Transport to delivery location extra if outside Punjab.' : 'Stock reserved for 7 days once accepted.',
      status: status === 'Quotation Submitted' ? 'Submitted' : 'Accepted', createdAt: history[1].at,
    });
  }
});
// keep quotations of open orders valid in the future
quotations.filter((q) => q.status === 'Submitted').forEach((q) => { q.validUntil = '2026-12-15'; });

// ---- messages (anonymous references only) -------------------------------
const M = [
  [1, 'B', 'Is the maize seed from this season\'s lot?'], [1, 'S', 'Yes, packed this season. Batch certificate is available at delivery.'],
  [1, 'B', 'Good, please proceed with the order.'],
  [5, 'B', 'Can you confirm the expected delivery date for the wheat seed?'], [5, 'S', 'It was dispatched yesterday and should arrive within two days.'],
  [5, 'B', 'Thank you. We will confirm once received.'],
  [6, 'S', 'Your dairy concentrate order is on the truck.'], [6, 'B', 'Understood. Please make sure the bags are sealed.'],
  [8, 'B', 'Can the DAP be delivered in two lots?'], [8, 'S', 'Yes, we can split it into 60 and 60 bags.'],
  [9, 'B', 'Please use the second lot for the field near the canal.'], [9, 'S', 'Noted, we will mention it in the delivery note.'],
  [10, 'S', 'Mangoes are being graded today. Crates will be packed tomorrow.'], [10, 'B', 'Great, we need them before Friday.'],
  [13, 'B', 'Could you include a purity certificate with the quotation?'], [13, 'S', 'Yes, it will be included with the delivery.'],
  [13, 'B', 'Please keep the quotation valid until next week.'],
  [14, 'B', 'Is a bulk discount possible for 100 bags?'], [14, 'S', 'The quoted rate already includes a bulk discount.'],
  [15, 'B', 'What is the warranty on the rotavator?'],
];
const messages = M.map(([n, who, body], i) => {
  const o = orders[n - 1];
  const ref = who === 'B' ? o.buyerId : o.supplierId;
  return { id: `MSG-${7001 + i}`, orderId: o.id, senderRef: ref, senderRole: who === 'B' ? 'buyer' : 'supplier', body, createdAt: ago(Math.max(1, 30 - i), i), readBy: i < 14 ? [o.buyerId, o.supplierId] : [ref] };
});

// ---- users -------------------------------------------------------------
const users = [{ id: 'USR-0001', email: 'admin@agriconnect.com', passwordHash: hashPassword('Admin123'), role: 'admin', refId: null, name: 'Platform Administrator', status: 'Active', createdAt: ago(300) }];
buyers.forEach((b) => users.push({ id: `USR-${b.id}`, email: b.email, passwordHash: hashPassword('Buyer123'), role: 'buyer', refId: b.id, status: 'Active', createdAt: ago(250) }));
suppliers.forEach((s) => users.push({ id: `USR-${s.id}`, email: s.email, passwordHash: hashPassword('Supplier123'), role: 'supplier', refId: s.id, status: 'Active', createdAt: ago(250) }));

// ---- notifications ---------------------------------------------------------
const N = [
  ['USR-0001', 'new_order', 'New purchase request', 'ORD-1018 was submitted by BUY-1006 for SUP-2007.', 'ORD-1018', 1],
  ['USR-0001', 'new_order', 'New purchase request', 'ORD-1017 was submitted by BUY-1004 for SUP-2010.', 'ORD-1017', 1],
  ['USR-0001', 'order_status', 'Order status updated', 'Order ORD-1011 is now "Accepted".', 'ORD-1011', 6],
  ['USR-0001', 'order_status', 'Order status updated', 'Order ORD-1004 is now "Completed".', 'ORD-1004', 90],
  ['USR-0001', 'low_stock', 'Low inventory alert', 'PRD-3012 (SUP-2004) has 2 Piece left.', null, 3],
  ['USR-BUY-1001', 'quotation', 'New quotation received', 'SUP-2001 submitted a quotation for ORD-1013: PKR 138,600.', 'ORD-1013', 4],
  ['USR-BUY-1001', 'order_status', 'Order status updated', 'Order ORD-1005 is now "Delivered".', 'ORD-1005', 2],
  ['USR-BUY-1001', 'order_status', 'Order status updated', 'Order ORD-1009 is now "Processing".', 'ORD-1009', 7],
  ['USR-BUY-1001', 'message', 'New message', 'SUP-2001 sent a message about ORD-1013.', 'ORD-1013', 3],
  ['USR-BUY-1001', 'order_status', 'Order status updated', 'Order ORD-1002 is now "Completed".', 'ORD-1002', 110],
  ['USR-BUY-1001', 'order_status', 'Order status updated', 'Order ORD-1001 is now "Completed".', 'ORD-1001', 140],
  ['USR-SUP-2001', 'new_order', 'New purchase request', 'BUY-1001 requested 50 Bag of Wheat Seed Faisalabad-2008. Order ORD-1016.', 'ORD-1016', 2],
  ['USR-SUP-2001', 'low_stock', 'Low inventory alert', 'Super Kernel Basmati Rice Seed (PRD-3003) has 90 Bag left. Threshold: 100.', null, 5],
  ['USR-SUP-2001', 'quotation', 'Quotation accepted', 'BUY-1001 accepted the quotation for ORD-1009. You can start processing.', 'ORD-1009', 8],
  ['USR-SUP-2001', 'message', 'New message', 'BUY-1001 sent a message about ORD-1013.', 'ORD-1013', 3],
  ['USR-SUP-2001', 'order_status', 'Order status updated', 'Order ORD-1005 is now "Delivered". Waiting for the buyer to confirm.', 'ORD-1005', 2],
  ['USR-SUP-2001', 'new_order', 'New purchase request', 'BUY-1001 requested 15 Bag of Super Kernel Basmati Rice Seed. Order ORD-1013.', 'ORD-1013', 4],
  ['USR-BUY-1002', 'order_status', 'Order status updated', 'Order ORD-1008 is now "Processing".', 'ORD-1008', 9],
  ['USR-SUP-2002', 'new_order', 'New purchase request', 'BUY-1002 requested 120 Bag of DAP Fertilizer (50 kg). Order ORD-1008.', 'ORD-1008', 14],
  ['USR-SUP-2006', 'order_status', 'Order status updated', 'Order ORD-1011 is now "Accepted".', 'ORD-1011', 6],
];
const notifications = N.map(([userId, type, title, message, orderId, d], i) => ({ id: `NTF-${8001 + i}`, userId, type, title, message, orderId, read: i % 3 === 2 || d > 60, createdAt: ago(d, i) }));

// ---- activities ---------------------------------------------------------
const activities = [];
orders.forEach((o, i) => {
  activities.push({ id: '', actorRole: 'buyer', actorRef: o.buyerId, action: 'order.create', entityRef: o.id, message: `${o.buyerId} submitted purchase request ${o.requestId} (${o.id})`, parties: [o.buyerId, o.supplierId], createdAt: o.createdAt });
  if (i < 15) activities.push({ id: '', actorRole: 'supplier', actorRef: o.supplierId, action: 'order.status', entityRef: o.id, message: `${o.supplierId} submitted a quotation for ${o.id}`, parties: [o.buyerId, o.supplierId], createdAt: o.statusHistory[1].at });
  if (o.statusHistory.length > 2) activities.push({ id: '', actorRole: 'buyer', actorRef: o.buyerId, action: 'order.status', entityRef: o.id, message: `Order ${o.id} moved to ${o.status}`, parties: [o.buyerId, o.supplierId], createdAt: o.updatedAt });
});
activities.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((a, i) => { a.id = `ACT-${9001 + i}`; });

const db = {
  settings: { platformName: 'AgriConnect', defaultCurrency: 'PKR', supportEmail: 'support@agriconnect.com', lowStockDefault: 100 },
  users, buyers, suppliers, products: P, orders, purchaseRequests, quotations, messages, notifications, activities, categories,
};

export function buildSeed() { return db; }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(root, 'db.json'), JSON.stringify(db, null, 2));
  console.log(`db.json created: ${buyers.length} buyers, ${suppliers.length} suppliers, ${P.length} products, ${orders.length} orders, ${purchaseRequests.length} requests, ${quotations.length} quotations, ${messages.length} messages, ${notifications.length} notifications`);
}
