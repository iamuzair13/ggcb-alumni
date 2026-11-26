-- 0002_identity_and_org.sql
-- Login identities (staff + alumni share ONE users table, context.md §6)
-- and organisational units (departments only — no faculties/programs).

CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'viewer', 'alumni');

CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             citext NOT NULL,
  password_hash     text,                       -- null until set-password link (Prompt 3)
  name              text NOT NULL,
  role              user_role NOT NULL,
  is_active         boolean NOT NULL DEFAULT true,
  email_verified_at timestamptz,
  last_login_at     timestamptz,
  -- bumped to invalidate outstanding JWT sessions on password
  -- reset / deactivation (decision recorded in docs/decisions.md)
  session_version   integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_email_uniq        UNIQUE (email),
  CONSTRAINT users_name_not_blank    CHECK (btrim(name) <> ''),
  CONSTRAINT users_password_nonempty CHECK (password_hash IS NULL OR password_hash <> '')
);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  code       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT departments_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT departments_code_not_blank CHECK (btrim(code) <> '')
);

-- Normalised uniqueness (D3: no seed rows — departments are created
-- through the admin CRUD later).
CREATE UNIQUE INDEX departments_name_lower_uniq ON departments (lower(btrim(name)));
CREATE UNIQUE INDEX departments_code_lower_uniq ON departments (lower(btrim(code)));

CREATE TRIGGER departments_set_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
