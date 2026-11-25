-- ─────────────────────────────────────────────────────────────────────────────
--  GROUPON POWER – PostgreSQL Initialisation
--  Runs once when the postgres container is first created.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fast LIKE / ILIKE searches

-- Set timezone
SET timezone = 'Asia/Kolkata';

-- Grant all privileges to app user (already the DB owner via POSTGRES_USER)
-- Nothing extra needed; Flask-Migrate will create all tables on first run.
