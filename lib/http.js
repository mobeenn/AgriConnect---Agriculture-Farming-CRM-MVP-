import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './auth.js';
import { ApiError } from './errors.js';
import { resolveActor } from '../services/auth.js';

export const ok = (data, meta, status = 200) =>
  NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });
export const okPage = (r) => ok(r.items, r.meta);

export const getActor = () => resolveActor(cookies().get(SESSION_COOKIE)?.value);
export const query = (request) => Object.fromEntries(new URL(request.url).searchParams);
export async function body(request) {
  try { return await request.json(); } catch { throw new ApiError(400, 'Request body must be valid JSON'); }
}

// Wraps a route: resolves the session actor on the server and maps errors to JSON.
export function handler(fn) {
  return async (request, ctx) => {
    try {
      return await fn({ request, actor: getActor(), params: ctx?.params || {} });
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json({ success: false, error: { message: e.message, details: e.details } }, { status: e.status });
      }
      console.error(e);
      return NextResponse.json({ success: false, error: { message: 'Something went wrong on the server' } }, { status: 500 });
    }
  };
}
