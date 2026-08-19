import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, comparePassword, generateToken, verifyToken } from '@/lib/auth/utils';
import { findUserByEmail, createUser } from '@/lib/database/user';

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, displayName } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELDS', message: '邮箱和密码为必填项' } },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: { code: 'PASSWORD_TOO_SHORT', message: '密码长度至少为6位' } },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: { code: 'EMAIL_EXISTS', message: '该邮箱已注册' } },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await createUser({
      email,
      password_hash: passwordHash,
      display_name: displayName,
    });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Set cookie
    const response = NextResponse.json(
      {
        userId: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        token,
      },
      { status: 201 }
    );

    response.cookies.set({
      name: process.env.AUTH_COOKIE_NAME || 'maic_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: '注册失败，请稍后重试' } },
      { status: 500 }
    );
  }
}
