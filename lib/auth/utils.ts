/**
 * Auth utility functions
 * Handles JWT creation, verification, and password hashing
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const AUTH_SECRET = process.env.AUTH_SECRET;
const JWT_EXPIRES_IN = '30d';

if (!AUTH_SECRET) {
  throw new Error('AUTH_SECRET is required for authentication');
}

export interface JWTPayload {
  sub: string; // userId
  email: string;
  role: 'learner' | 'admin';
  iat: number;
  exp: number;
}

/**
 * Generate JWT token
 */
export function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role as 'learner' | 'admin',
    },
    AUTH_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, AUTH_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
