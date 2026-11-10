import { readDb } from '../lib/db.js';
import { verifyPassword, verifySession } from '../lib/auth.js';
import { ApiError } from '../lib/errors.js';
import { serializeUser } from '../lib/privacy.js';

function displayName(db, user) {
  if (user.role === 'admin') return user.name || 'Administrator';
  const list = user.role === 'buyer' ? db.buyers : db.suppliers;
  return list.find((x) => x.id === user.refId)?.contactPerson || user.refId;
}

export async function login(email, password) {
  const db = readDb();
  const user = db.users.find((u) => u.email === String(email || '').trim().toLowerCase());
  if (!user || !verifyPassword(password, user.passwordHash)) throw new ApiError(401, 'Invalid email or password');
  if (user.status !== 'Active') throw new ApiError(403, 'This account is not active. Please contact the administrator.');
  return { user: { ...serializeUser(user), name: displayName(db, user) }, session: { uid: user.id } };
}

// Turns a verified session token into an "actor" using the CURRENT database state.
export function resolveActor(token) {
  const session = verifySession(token);
  if (!session) return null;
  const db = readDb();
  const user = db.users.find((u) => u.id === session.uid);
  if (!user || user.status !== 'Active') return null;
  return { userId: user.id, role: user.role, refId: user.refId || null, email: user.email, name: displayName(db, user) };
}

export const actorToUser = (a) => ({ id: a.userId, role: a.role, refId: a.refId, email: a.email, name: a.name });
