import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, containsContactInfo } from '../lib/validation.js';
import { signSession, verifySession, hashPassword, verifyPassword } from '../lib/auth.js';

test('validate coerces and rejects', () => {
  const schema = { n: { type: 'int', required: true, min: 1 }, e: { type: 'email', required: true }, k: { type: 'enum', values: ['a', 'b'], default: 'a' } };
  assert.deepEqual(validate({ n: '5', e: 'A@B.com' }, schema), { n: 5, e: 'a@b.com', k: 'a' });
  assert.throws(() => validate({ n: 0, e: 'x' }, schema), (e) => e.status === 422 && Boolean(e.details.n) && Boolean(e.details.e));
});
test('contact info detection', () => {
  assert.ok(containsContactInfo('+92 300 1234567'));
  assert.ok(containsContactInfo('me@x.pk'));
  assert.ok(!containsContactInfo('Need 1,200,000 PKR by 2026-12-01 in 3 lots'));
});
test('sessions are signed and tamper-proof', () => {
  const t = signSession({ uid: 'USR-1' });
  assert.equal(verifySession(t).uid, 'USR-1');
  const [body, sig] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ uid: 'USR-0001', exp: Date.now() + 1e6 })).toString('base64url');
  assert.equal(verifySession(`${forged}.${sig}`), null);
  assert.equal(verifySession(`${body}.bad`), null);
  assert.equal(verifySession('garbage'), null);
});
test('password hashing', () => {
  const h = hashPassword('Secret123');
  assert.ok(verifyPassword('Secret123', h));
  assert.ok(!verifyPassword('secret123', h));
});
