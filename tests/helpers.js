import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSeed } from '../scripts/seed.js';

const file = path.join(os.tmpdir(), `agri-test-${process.pid}.json`);
process.env.DB_PATH = file;

export const resetDb = () => fs.writeFileSync(file, JSON.stringify(buildSeed()));
export const loadDb = () => JSON.parse(fs.readFileSync(file, 'utf8'));
export const actors = {
  admin: { userId: 'USR-0001', role: 'admin', refId: null, name: 'Admin' },
  buyer: { userId: 'USR-BUY-1001', role: 'buyer', refId: 'BUY-1001', name: 'Ahmed Raza' },
  buyer2: { userId: 'USR-BUY-1002', role: 'buyer', refId: 'BUY-1002', name: 'Usman Tariq' },
  supplier: { userId: 'USR-SUP-2001', role: 'supplier', refId: 'SUP-2001', name: 'Khurram Shahzad' },
  supplier2: { userId: 'USR-SUP-2002', role: 'supplier', refId: 'SUP-2002', name: 'Waqar Ahmed' },
};
// Every private string of the OTHER side that must never appear in a response.
export function privateStrings(kind) {
  const db = loadDb();
  const list = kind === 'supplier' ? db.suppliers : db.buyers;
  return list.flatMap((p) => [p.businessName, p.contactPerson, p.email, p.phone]);
}
export function assertNoLeak(assert, payload, kind, label = '') {
  const text = JSON.stringify(payload);
  for (const s of privateStrings(kind)) assert.ok(!text.includes(s), `${label} leaked ${kind} detail: ${s}`);
  assert.ok(!/passwordHash|scrypt\$/.test(text), `${label} leaked password data`);
}
export const rejects = (assert, promise, statuses) =>
  assert.rejects(promise, (e) => { assert.ok(statuses.includes(e.status), `expected ${statuses}, got ${e.status}: ${e.message}`); return true; });
