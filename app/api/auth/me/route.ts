import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/utils';

/**
 * GET /api/auth/me
 * Get current user info from JWT token
 */
export async function GET(request: NextRequest) {
  try {
    const cookieName = process.env.AUTH_COOKIE_NAME || 'maic_session';
    const token = request.cookies.get(cookieName)?.value;

    if (!token) {
      return NextResponse.json(
        { error: { code: 'NOT_AUTHENTICATED', message: '未登录' } },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: { code: 'INVALID_TOKEN', message: '登录状态已过期' } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: '获取用户信息失败' } },
      { status: 500 }
    );
  }
}
