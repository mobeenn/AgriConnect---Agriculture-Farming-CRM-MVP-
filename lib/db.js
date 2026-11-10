// Server-side JSON database. Never import this file from a client component.
import fs from 'node:fs';
import path from 'node:path';

export function dbPath() {
  return process.env.DB_PATH || path.join(process.cwd(), 'db.json');
}

export function readDb() {
  return JSON.parse(fs.readFileSync(dbPath(), 'utf8'));
}

export function writeDb(db) {
  const file = dbPath();
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, file); // atomic replace
}

// All writes go through a single queue: read -> modify -> write.
// If fn throws, nothing is written (acts like a transaction).
// Stored on globalThis so every Next.js route bundle shares one queue.
globalThis.__agriDbQueue = globalThis.__agriDbQueue || Promise.resolve();
export function mutate(fn) {
  const run = globalThis.__agriDbQueue.then(() => {
    const db = readDb();
    const result = fn(db);
    writeDb(db);
    return result;
  });
  globalThis.__agriDbQueue = run.catch(() => {});
  return run;
}
