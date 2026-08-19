import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/utils';
import { listUsers, getUserStats, updateUser } from '@/lib/database/user';

/**
 * Helper to check auth and return user if admin
 */
async function requireAdmin(request: NextRequest) {
  const cookieName = process.env.AUTH_COOKIE_NAME || 'maic_session';
  const token = request.cookies.get(cookieName)?.value;

  if (!token) {
    return { error: NextResponse.json({ error: { code: 'NOT_AUTHENTICATED' } }, { status: 401 }) };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { error: NextResponse.json({ error: { code: 'INVALID_TOKEN' } }, { status: 401 }) };
  }

  // Check if user is admin
  if (payload.role !== 'admin') {
    return { error: NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 }) };
  }

  return { user: payload, error: null };
}

/**
 * GET /api/admin/users
 * List users with pagination and search
 */
export async function GET(request: NextRequest) {
  const { error, user } = await requireAdmin(request);
  if (error) return error;

  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('q') || undefined;

    const result = await listUsers({ page, limit, search });

    // Remove password_hash from response
    const safeUsers = result.users.map(({ password_hash, ...user }) => user);

    return NextResponse.json({
      users: safeUsers,
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: '获取用户列表失败' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user fields (displayName, role, isActive)
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { displayName, role, isActive } = body;

    const updateInput = {
      display_name: displayName,
      role: role,
      is_active: isActive,
    };

    const updatedUser = await updateUser(params.id, updateInput);

    if (!updatedUser) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Remove password_hash from response
    const { password_hash, ...safeUser } = updatedUser;

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: '更新用户失败' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Soft delete (deactivate) a user
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    // Soft delete: set is_active to false
    const updatedUser = await updateUser(params.id, { is_active: false });

    if (!updatedUser) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: '删除用户失败' } },
      { status: 500 }
    );
  }
}
