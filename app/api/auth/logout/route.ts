import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clear authentication cookie
 */
export async function POST() {
  const response = NextResponse.json({ success: true });

  const cookieName = process.env.AUTH_COOKIE_NAME || 'maic_session';
  response.cookies.set({
    name: cookieName,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
