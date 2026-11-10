// Server-side page guard used by the role layouts. Authorization of data is
// still enforced again inside every API route / service.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE } from './auth.js';
import { resolveActor } from '../services/auth.js';

export function currentActor() {
  return resolveActor(cookies().get(SESSION_COOKIE)?.value);
}
export function guard(role) {
  const actor = currentActor();
  if (!actor) redirect('/login');
  if (actor.role !== role) redirect('/unauthorized');
  return actor;
}
