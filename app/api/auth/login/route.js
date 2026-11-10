import { NextResponse } from 'next/server';
import { handler, body } from '@/lib/http.js';
import { login } from '@/services/auth.js';
import { signSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth.js';
import { ApiError } from '@/lib/errors.js';

export const POST = handler(async ({ request }) => {
  const { email, password } = await body(request);
  if (!email || !password) throw new ApiError(422, 'Email and password are required');
  const { user, session } = await login(email, password);
  const res = NextResponse.json({ success: true, data: user });
  res.cookies.set(SESSION_COOKIE, signSession(session), sessionCookieOptions());
  return res;
});
