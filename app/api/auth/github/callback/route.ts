import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth/utils';
import { findUserByEmail, createUser } from '@/lib/database/user';

async function getGitHubUser(accessToken: string): Promise<{
  id: number;
  email: string;
  name: string | null;
  login: string;
}> {
  // Get primary email
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'OpenMAIC' },
  });
  if (!userRes.ok) throw new Error('Failed to fetch GitHub user');
  const user = await userRes.json();

  // Get emails
  const emailsRes = await fetch('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'OpenMAIC' },
  });
  let email = user.email;
  if (!email) {
    const emails = await emailsRes.json();
    const primary = (emails as any[])?.find((e: any) => e.primary && e.verified);
    email = primary?.email;
  }

  if (!email) throw new Error('No verified email from GitHub');

  return {
    id: user.id,
    email,
    name: user.name || user.login,
    login: user.login,
  };
}

async function createOrUpdateUser(email: string, name: string) {
  let user = await findUserByEmail(email);

  if (!user) {
    // Auto-generate a random password for OAuth users (they can't log in with password)
    const tempPassword = Math.random().toString(36).substring(2) + Date.now();
    const passwordHash = await hashPassword(tempPassword);
    user = await createUser({
      email,
      password_hash: passwordHash,
      display_name: name,
      role: 'learner',
    });
  } else {
    // Update display name if it was null or different
    if (!user.display_name || user.display_name !== name) {
      const { updateUser } = await import('@/lib/database/user');
      await updateUser(user.id, { display_name: name });
      user.display_name = name;
    }
  }

  return user;
}

/**
 * GET /api/auth/github/callback
 * Handle GitHub OAuth callback
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    const errorCode = error;
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/login?error=${encodeURIComponent(errorCode || '授权被拒绝')}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/login?error=missing_code`
    );
  }

  const storedState = request.cookies.get('github_oauth_state')?.value;
  if (state !== storedState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/login?error=invalid_state`
    );
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.AUTH_GITHUB_ID,
        client_secret: process.env.AUTH_GITHUB_SECRET,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/api/auth/github/callback`,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get GitHub user info
    const gitHubUser = await getGitHubUser(tokenData.access_token);

    // Create or update user in our database
    const user = await createOrUpdateUser(gitHubUser.email, gitHubUser.name);

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Set session cookie
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/`
    );
    response.cookies.set({
      name: process.env.AUTH_COOKIE_NAME || 'maic_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    // Clear OAuth state cookie
    response.cookies.delete('github_oauth_state');

    return response;
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/login?error=oauth_failed`
    );
  }
}
