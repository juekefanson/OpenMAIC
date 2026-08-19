import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/github
 * Redirect to GitHub OAuth authorization page
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.AUTH_GITHUB_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/api/auth/github/callback`;

  if (!clientId) {
    return NextResponse.json({ error: 'GitHub OAuth not configured' }, { status: 500 });
  }

  const state = Math.random().toString(36).substring(2);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state,
  });

  // Store state in cookie for verification
  const response = NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
  response.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 5, // 5 minutes
    path: '/',
  });

  return response;
}
