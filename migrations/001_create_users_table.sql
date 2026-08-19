-- Migration: Create users table
-- Version: 2026-08-17
-- Purpose: Add user authentication table for login/registration system

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,   -- bcrypt hash
  display_name TEXT,
  role        TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'admin')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster email lookups during login
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for active users list
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE is_active = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin user (password: admin123 - change after first login)
-- Note: This bcrypt hash is for 'admin123' with cost factor 12
-- INSERT INTO users (email, password_hash, display_name, role)
-- VALUES ('admin@openmaic.local', '$2b$12$KIXxGVPidQUXhxbVBQMz2eLq7y6LqL8Z9v8F5tN6wX2fQ7yHrKZiG', '管理员', 'admin');

-- To generate your own bcrypt hash, run:
-- node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('your-password', 12));"
