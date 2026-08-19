import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/utils';
import { getUserStats } from '@/lib/database/user';

/**
 * Helper to check auth and return user if admin
 */
async function requireAdmin(request: Request) {
  const cookieName = process.env.AUTH_COOKIE_NAME || 'maic_session';
  const token = (request as NextRequest).cookies.get(cookieName)?.value;

  if (!token) {
    return { error: NextResponse.json({ error: { code: 'NOT_AUTHENTICATED' } }, { status: 401 }) };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { error: NextResponse.json({ error: { code: 'INVALID_TOKEN' } }, { status: 401 }) };
  }

  if (payload.role !== 'admin') {
    return { error: NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 }) };
  }

  return { user: payload, error: null };
}

/**
 * GET /api/admin/stats
 * Get user statistics for admin dashboard
 */
export async function GET(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const stats = await getUserStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: '获取统计信息失败' } },
      { status: 500 }
    );
  }
}
