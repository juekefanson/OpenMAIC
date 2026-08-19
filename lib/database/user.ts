/**
 * Database utility for user authentication
 * 
 * Provides functions to interact with the users table in PostgreSQL
 */

import { Pool } from 'pg';

let pool: Pool | null = null;

export function getUserPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  role: 'learner' | 'admin';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  password_hash: string;
  display_name?: string;
  role?: 'learner' | 'admin';
}

export interface UpdateUserInput {
  display_name?: string;
  role?: 'learner' | 'admin';
  is_active?: boolean;
}

/**
 * Create a new user
 */
export async function createUser(input: CreateUserInput): Promise<User> {
  const pool = getUserPool();
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, display_name, role, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING *`,
    [input.email, input.password_hash, input.display_name || null, input.role || 'learner']
  );
  return result.rows[0] as User;
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const pool = getUserPool();
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] as User | null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  const pool = getUserPool();
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] as User | null;
}

/**
 * Update user fields
 */
export async function updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
  const pool = getUserPool();
  const sets: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (input.display_name !== undefined) {
    sets.push(`display_name = $${paramIndex++}`);
    values.push(input.display_name);
  }
  if (input.role !== undefined) {
    sets.push(`role = $${paramIndex++}`);
    values.push(input.role);
  }
  if (input.is_active !== undefined) {
    sets.push(`is_active = $${paramIndex++}`);
    values.push(input.is_active);
  }

  if (sets.length === 0) return null;

  sets.push(`updated_at = now()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] as User | null;
}

/**
 * List users with pagination and search
 */
export async function listUsers(options: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ users: User[]; total: number }> {
  const pool = getUserPool();
  const page = options.page || 1;
  const limit = options.limit || 20;
  const offset = (page - 1) * limit;

  let whereClause = '';
  let values: any[] = [];
  let paramIndex = 1;

  if (options.search) {
    whereClause = `WHERE email ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex}`;
    values.push(`%${options.search}%`);
    paramIndex++;
  }

  // Count total
  const countResult = await pool.query(
    `SELECT COUNT(*) as count FROM users ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Fetch paginated users
  const result = await pool.query(
    `SELECT * FROM users ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...values, limit, offset]
  );

  return {
    users: result.rows as User[],
    total,
  };
}

/**
 * Get user stats for admin dashboard
 */
export async function getUserStats(): Promise<{
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  newUsersToday: number;
  newUsersThisWeek: number;
}> {
  const pool = getUserPool();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_users,
      COUNT(CASE WHEN is_active THEN 1 END) as active_users,
      COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
      COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_users_today,
      COUNT(CASE WHEN created_at >= $2 THEN 1 END) as new_users_this_week
    FROM users
  `, [today, weekAgo]);

  return {
    totalUsers: parseInt(result.rows[0].total_users, 10),
    activeUsers: parseInt(result.rows[0].active_users, 10),
    adminCount: parseInt(result.rows[0].admin_count, 10),
    newUsersToday: parseInt(result.rows[0].new_users_today, 10),
    newUsersThisWeek: parseInt(result.rows[0].new_users_this_week, 10),
  };
}
