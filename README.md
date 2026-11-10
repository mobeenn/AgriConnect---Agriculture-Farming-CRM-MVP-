# AgriConnect - Agriculture & Farming CRM (MVP)

AgriConnect is a B2B marketplace and CRM that connects agricultural **buyers** and **suppliers** through an **anonymous intermediary**. Buyers and suppliers trade using references such as `BUY-1001`, `SUP-2001` and `ORD-1001`. Neither side can ever see the other's identity. Administrators see everything.

It is a full-stack Next.js app: React UI, REST API route handlers, server-side business logic, cookie sessions, and a JSON file database (`db.json`).

---

## 1. Technology stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), JavaScript only (no TypeScript) |
| UI | Tailwind CSS, Lucide React icons, Recharts |
| Backend | Next.js Route Handlers (REST), service layer in `services/` |
| Database | Single `db.json` file, accessed only on the server (`lib/db.js`) |
| Auth | Signed, HTTP-only session cookie (HMAC-SHA256) + scrypt password hashes |
| Tests | Node's built-in test runner (`node --test`), no extra dependencies |

## 2. Prerequisites

- **Node.js 20.6 or newer** (check with `node -v`). Download from https://nodejs.org (LTS).
- npm (comes with Node).
- Internet access for `npm install` (and for Google Fonts on first run; the app falls back to system fonts offline).

## 3. Installation and running (beginner friendly)

1. Extract `AgriConnect-CRM-MVP.zip`.
2. Open the extracted folder in VS Code (File > Open Folder).
3. Open a terminal in VS Code (Terminal > New Terminal) and run:

```bash
npm install
npm run dev
```

4. Open http://localhost:3000 in your browser and sign in with a demo account below.

Other commands:

```bash
npm test          # run the automated tests (privacy, workflow, validation, HTTP routes)
npm run build     # production build
npm start         # run the production build
npm run reset-db  # regenerate db.json with the original demo data
```

Optional: copy `.env.example` to `.env.local` and set `SESSION_SECRET` to your own long random string.

## 4. Demo login credentials

| Role | Email | Password | Public ID |
|---|---|---|---|
| Admin | admin@agriconnect.com | Admin123 | - |
| Buyer | buyer@agriconnect.com | Buyer123 | BUY-1001 |
| Supplier | supplier@agriconnect.com | Supplier123 | SUP-2001 |

All other seeded buyers use password `Buyer123` and suppliers use `Supplier123`. Their emails are visible to the admin in the Buyers / Suppliers screens (for example `procurement@almadinafarms.pk` is BUY-1002 and `sales@sarsabzfert.pk` is SUP-2002). Use them to see how a different buyer or supplier is isolated from the demo accounts.

## UI design notes

The interface uses a farming theme: a floating rounded header and a half-moon bottom navigation (items sit on an arc inside a semicircle, the active page glows like a moon, it can be collapsed with the arrow on top; code in `components/MoonNav.jsx`), hand-drawn SVG scenes (sun, hills, crop rows, swaying wheat, leaves) in `components/Illustrations.jsx`, illustrated product images in `public/images/categories` (regenerate with `node scripts/make-images.js`), and staggered entrance animations, count-up numbers and hover motion. Animations are disabled automatically for users who prefer reduced motion. Colours live in `tailwind.config.mjs`.

## 5. How the workflow works

1. Buyer browses products (supplier shown only as `SUP-xxxx`) and sends a **purchase request**. The backend creates request `REQ-xxxx` and order `ORD-xxxx` (status **Pending**) and notifies the supplier.
2. Supplier opens **Incoming Requests** and sends a **quotation** (status **Quotation Submitted**). They can re-quote; older quotations become *Superseded*. They can also decline the request (**Rejected**).
3. Buyer **accepts** (order becomes **Accepted**, stock is reserved) or **rejects** (order becomes **Rejected**). Buyers can cancel while Pending / Quotation Submitted.
4. Supplier moves the order **Processing > Dispatched** (with expected date and transport) **> Delivered**.
5. Buyer confirms receipt (**Completed**).
6. Admin can override any status. Cancelling or rejecting an accepted order returns the reserved stock.

"My Purchase Requests / Incoming Requests" show orders before acceptance; "My Orders" show accepted orders onward.

## 6. Project structure

```
app/
  login/  unauthorized/  page.js           public pages and root redirect
  admin/ buyer/ supplier/                  role portals (layout.js = server-side role guard)
    dashboard, products, orders, requests, messages, notifications, ...
  api/**/route.js                          REST endpoints (thin wrappers around services)
components/
  AppShell.jsx  ui.jsx  Toast.jsx  hooks.js  LoginForm.jsx
  pages/                                   DashboardView, PartiesPage, ProductsPage, OrdersPage,
                                           OrderDetail, MessagesPage, NotificationsPage, ProfilePage, SettingsPage
services/                                  business logic + authorization (no Next.js imports)
  auth, parties, products, orders, quotations, messages, notifications, dashboard, settings, inventory, common
lib/
  db.js            read/write/transaction-like mutate() for db.json (server only)
  auth.js          password hashing, signed sessions
  authz.js         role + ownership checks, order scoping
  privacy.js       role-specific whitelist serializers
  validation.js    input validation + contact-info detection
  workflow.js      order status transition table
  http.js          route wrapper: session -> actor, error -> JSON
  guard.js         server page guard
  client-api.js    browser fetch helper and formatters
scripts/seed.js    generates db.json     scripts/make-images.js   generates category images
tests/             privacy, workflow, validation and HTTP route tests
db.json            the database
```

## 7. Database

`db.json` has these collections: `users, buyers, suppliers, products, orders, purchaseRequests, quotations, messages, notifications, activities, categories` (plus a small `settings` object).

Seeded: 1 admin, 8 buyers, 10 suppliers (18 more user logins), 30 products, 20 orders with 20 purchase requests (one per order), 15 quotations, 20 messages, 20 notifications, 47 activity entries. Currency is PKR.

Relations: `product.supplierId`, `order.buyerId / supplierId / productId`, `quotation.orderId`, `message.orderId` (the conversation), `notification.userId`.

All reads and writes happen on the server in `lib/db.js`. Writes go through one queue and are written atomically (temp file then rename). **Changes persist in db.json** and survive refreshes and restarts.

**Reset the demo data:** stop the server, run `npm run reset-db`, start again.

## 8. API reference

All responses use `{ "success": true, "data": ..., "meta": ... }` or `{ "success": false, "error": { "message", "details" } }`. List endpoints accept `page`, `pageSize` (max 100) and filters. Status codes: 200/201 success, 400 bad JSON, 401 not signed in, 403 wrong role, 404 not found (also used for records you do not own), 409 workflow conflict, 422 validation error.

| Method & path | Who | Purpose |
|---|---|---|
| POST /api/auth/login | public | Sign in (sets session cookie) |
| POST /api/auth/logout | any | Sign out |
| GET /api/auth/me | any | Current user |
| GET /api/dashboard | any | Role-specific stats, charts, recent items |
| GET, POST /api/buyers | admin | List (search, status, type, location, sort) / create |
| GET, PUT, DELETE /api/buyers/[id] | admin | Detail with purchase history and activity / update / delete |
| GET, POST /api/suppliers | admin | Same for suppliers |
| GET, PUT, DELETE /api/suppliers/[id] | admin | Detail with products and order history / update / delete |
| GET /api/products | any | Role-filtered list (search, category, minPrice, maxPrice, availability, lowStock, sort, dir) |
| POST /api/products | supplier, admin | Create (supplier owns it automatically) |
| GET, PUT, DELETE /api/products/[id] | owner supplier, admin | Read / update (incl. inventory) / delete |
| GET /api/orders | any (scoped) | List (status, search) |
| POST /api/orders | buyer | Same as submitting a purchase request |
| GET, PUT /api/orders/[id] | party, admin | Detail with quotations / change status or delivery info |
| GET, POST /api/purchase-requests | any (scoped) / buyer | List / submit |
| PUT /api/purchase-requests/[id] | buyer, supplier, admin | Edit a pending request, or `{status:"Cancelled"}` / `{status:"Rejected"}` |
| GET, POST /api/quotations | any (scoped) / supplier | List / submit quotation |
| PUT /api/quotations/[id] | buyer | `{ "action": "accept" \| "reject" }` |
| GET /api/messages | any | Conversation list, or `?orderId=` for one thread |
| POST /api/messages | buyer, supplier | `{ orderId, body }` |
| GET /api/notifications | any | Own notifications (`unread=true`, `type`) with `unreadCount` |
| PUT /api/notifications/[id] | owner | `{ read: true \| false }` |
| POST /api/notifications/read-all | any | Mark all own as read |
| GET, PUT /api/profile | buyer, supplier (admin GET) | Own profile |
| GET /api/categories | any | Product categories |
| GET, PUT /api/settings | admin | Platform settings |

## 9. Buyer / supplier privacy: how it is implemented

Privacy is enforced on the **server**, not by hiding things in the UI.

1. **Anonymous IDs are the record IDs.** Buyers are `BUY-1001...`, suppliers `SUP-2001...`. Nothing else identifies a party in order, product, quotation, message or notification records.
2. **Whitelist serializers** (`lib/privacy.js`). Every API response is built by a function that lists the allowed fields per role (`serializeOrder`, `serializeProduct`, `serializeQuotation`, ...). A buyer's order contains `supplierRef` only; a supplier's contains `buyerRef` only. New database fields can never leak by accident because they must be added to the whitelist first. Only admins receive `buyerName` / `supplierName`.
3. **Ownership checks** (`lib/authz.js`, `services/*`). Buyers only see their own orders and requests; suppliers only those assigned to them and their own products; supplier `supplierId` is taken from the session, never from the request body. Foreign records return **404** so their existence is not revealed.
4. **Admin-only party endpoints.** `/api/buyers` and `/api/suppliers` (the only places full identities are returned) refuse every non-admin with 403. A buyer or supplier can read only their *own* profile via `/api/profile`.
5. **No contact exchange.** Messages, delivery locations, requirements, quotation notes and status notes are rejected (422) if they contain emails, phone numbers (9 or more digits), links, or words like "WhatsApp". Notifications and activity messages are generated by the server from references only.
6. **Sessions** are HMAC-signed, HTTP-only cookies. The user is re-loaded from the database on every request, so suspended or deleted accounts lose access immediately. Page layouts also check the role on the server, and APIs check it again independently.
7. **Passwords** are stored as salted scrypt hashes, and hashes are never returned by any serializer.

Automated tests (`npm test`) scan every buyer and supplier response for any private string of the other side (business names, contact people, emails, phones) across lists, details, dashboards, messages and notifications, including data created during the tests.

## 10. Automated tests

`npm test` runs 37 tests:

- **privacy.test.js** - leak scans for buyer and supplier on every endpoint, ownership, role limits, contact-info blocking, admin visibility, login hashing.
- **workflow.test.js** - complete order lifecycle, inventory reserve/restore, quotation rules, low-stock alerts, notification ownership, buyer/supplier CRUD and profile limits, dashboards.
- **validation.test.js** - validator, contact detection, session signing/tampering, password hashing.
- **api.test.js** - runs the real `app/api/**/route.js` handlers with cookie sessions: 401/403/404/409/422 codes, forged cookies, end-to-end order flow over HTTP, persistence to the database file.

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| `node` / `npm` not recognised | Install Node.js LTS from nodejs.org and reopen the terminal. |
| `npm install` fails | Check your internet connection, then delete `node_modules` and `package-lock.json` and retry. |
| Port 3000 already in use | `npx next dev -p 3001` and open http://localhost:3001. |
| Fonts look different / font warning offline | Harmless. System fonts are used as a fallback. |
| Everything redirects to /login | Your session expired (8 hours) or the cookie was cleared. Sign in again. |
| Data looks wrong or I want a fresh start | `npm run reset-db` (stop the server first). |
| `db.json` unreadable after a manual edit | Fix the JSON or run `npm run reset-db`. |
| Login works on `next start` but cookie is lost on HTTPS | Set `COOKIE_SECURE=true` in `.env.local` when serving over HTTPS only. |

## 12. Known limitations (MVP)

- **Not yet exercised in a real browser by the author.** The build environment had no internet, so `npm install`, `next build` and visual checks could not be run there. Backend logic and every API route are covered by the automated tests, and all UI files were syntax- and import-checked, but please report anything odd on first run.
- `db.json` is a single-process JSON file: fine for a demo, not for concurrent production use (use a real database for that).
- Passwords can only be set at creation by an admin; there is no "forgot password" or email delivery.
- No login rate limiting, CSRF tokens (SameSite=Lax cookies and JSON-only APIs are used instead), or file uploads (product images are URLs or the bundled category images).
- Delivery location is free text entered by the buyer. It is scanned for phone numbers/emails/links, but a buyer could still type a street address there; that is required for suppliers to deliver.
- Quotation acceptance reserves stock; stock is not decremented again at delivery.
- Admins can read conversations but not post in them.
- Seed data has 20 purchase requests (one per order) instead of 10, because each request is linked 1:1 with its order.
- Dates on charts are anchored to the latest order in the database.
