-- 0003_alumni.sql
-- Alumni data records + their change-request workflow.
-- BS-only for now (context.md §2): the `degree` column has a named check so a
-- later migration can relax it — no multi-degree logic is built.

CREATE TYPE gender_type           AS ENUM ('male', 'female', 'other');
CREATE TYPE verify_status         AS ENUM ('under_approval', 'verified', 'rejected');
CREATE TYPE datasource_type       AS ENUM ('registration', 'import');
CREATE TYPE change_request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE alumni (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Login link: nullable — imported-only records have no login.
  -- SET NULL: deleting a login identity must not destroy the alumni record.
  user_id            uuid UNIQUE REFERENCES users (id) ON DELETE SET NULL,

  roll_number        text NOT NULL,
  roll_number_norm   text GENERATED ALWAYS AS (lower(btrim(roll_number))) STORED,
  full_name          text NOT NULL,
  email              citext,
  phone              text,
  gender             gender_type,            -- value set recorded in docs/decisions.md

  department_id      uuid NOT NULL REFERENCES departments (id) ON DELETE RESTRICT,
  degree             text NOT NULL DEFAULT 'BS',
  session_start_year smallint,
  session_end_year   smallint,
  passing_year       smallint,

  city               text,
  district           text,
  country            text,
  employer           text,
  job_title          text,
  sector             text,
  bio                text,
  social_links       jsonb NOT NULL DEFAULT '{}'::jsonb,

  photo_path         text,
  mentor_available   boolean NOT NULL DEFAULT false,
  directory_visible  boolean NOT NULL DEFAULT false,
  show_email         boolean NOT NULL DEFAULT false,
  show_phone         boolean NOT NULL DEFAULT false,
  is_featured        boolean NOT NULL DEFAULT false,
  achievement        text,

  verify_status      verify_status NOT NULL DEFAULT 'under_approval',
  reject_reason      text,
  verified_by        uuid REFERENCES users (id) ON DELETE SET NULL,
  verified_at        timestamptz,
  datasource         datasource_type NOT NULL,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT alumni_degree_bs              CHECK (degree = 'BS'),
  CONSTRAINT alumni_full_name_not_blank    CHECK (btrim(full_name) <> ''),
  CONSTRAINT alumni_roll_number_not_blank  CHECK (btrim(roll_number) <> ''),
  CONSTRAINT alumni_session_start_range    CHECK (session_start_year IS NULL OR session_start_year BETWEEN 1950 AND 2100),
  CONSTRAINT alumni_session_end_range      CHECK (session_end_year   IS NULL OR session_end_year   BETWEEN 1950 AND 2100),
  CONSTRAINT alumni_passing_year_range     CHECK (passing_year       IS NULL OR passing_year       BETWEEN 1950 AND 2100),
  CONSTRAINT alumni_session_order          CHECK (session_start_year IS NULL OR session_end_year IS NULL OR session_end_year >= session_start_year),
  CONSTRAINT alumni_bio_length             CHECK (char_length(bio) <= 1000),
  CONSTRAINT alumni_social_links_object    CHECK (jsonb_typeof(social_links) = 'object'),
  CONSTRAINT alumni_verified_needs_at      CHECK (verify_status <> 'verified' OR verified_at IS NOT NULL),
  CONSTRAINT alumni_rejected_needs_reason  CHECK (verify_status <> 'rejected' OR (reject_reason IS NOT NULL AND btrim(reject_reason) <> ''))
);

-- ----------------------------------------------------------------------------
-- D4 (OPEN): global uniqueness is a default; the owner must verify against the
-- Excel sample. The rule lives ONLY here — a later migration can replace this
-- one index (e.g. per department+session) without touching anything else.
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX alumni_roll_number_norm_uniq ON alumni (roll_number_norm);

-- Nullable emails: several rows may have NULL; non-nulls must be unique
-- (citext makes the comparison case-insensitive).
CREATE UNIQUE INDEX alumni_email_uniq ON alumni (email) WHERE email IS NOT NULL;

-- Planned predicates only (see docs/db/schema.md for rationale):
CREATE INDEX alumni_department_id_idx         ON alumni (department_id);
CREATE INDEX alumni_passing_year_idx          ON alumni (passing_year);
CREATE INDEX alumni_verify_status_created_idx ON alumni (verify_status, created_at DESC);

CREATE TRIGGER alumni_set_updated_at
  BEFORE UPDATE ON alumni
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE alumni_change_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_id   uuid NOT NULL REFERENCES alumni (id) ON DELETE RESTRICT,
  changes     jsonb NOT NULL,                        -- field -> {old, new}
  status      change_request_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT alumni_change_requests_changes_object  CHECK (jsonb_typeof(changes) = 'object'),
  CONSTRAINT alumni_change_requests_review_required CHECK (status = 'pending' OR reviewed_at IS NOT NULL)
);

-- Recommended decision (docs/decisions.md): at most ONE pending change
-- request per alumnus — prevents duplicate review queues.
CREATE UNIQUE INDEX alumni_change_requests_one_pending
  ON alumni_change_requests (alumni_id) WHERE status = 'pending';

CREATE INDEX alumni_change_requests_status_created_idx
  ON alumni_change_requests (status, created_at);

CREATE TRIGGER alumni_change_requests_set_updated_at
  BEFORE UPDATE ON alumni_change_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
