-- ============================================================
-- Attendee – Initial schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- organizations
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- users (profil, utökar auth.users)
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('owner','admin','staff')) DEFAULT 'staff',
  email            TEXT NOT NULL,
  name             TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- events
CREATE TABLE IF NOT EXISTS events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  location         TEXT,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  max_participants INTEGER,
  status           TEXT NOT NULL CHECK (status IN ('draft','published','closed','archived')) DEFAULT 'draft',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- registration_fields
CREATE TABLE IF NOT EXISTS registration_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  field_type  TEXT NOT NULL CHECK (field_type IN ('text','select','checkbox')),
  required    BOOLEAN NOT NULL DEFAULT FALSE,
  options     JSONB,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- participants
CREATE TABLE IF NOT EXISTS participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  qr_code         UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  checked_in_at   TIMESTAMPTZ,
  checked_in_by   UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- participant_field_values
CREATE TABLE IF NOT EXISTS participant_field_values (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  field_id        UUID NOT NULL REFERENCES registration_fields(id) ON DELETE CASCADE,
  value           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_fields   ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_field_values ENABLE ROW LEVEL SECURITY;

-- Hjälpfunktioner
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- organizations
CREATE POLICY "org_select"       ON organizations FOR SELECT USING (id = get_user_org_id());
CREATE POLICY "org_update_owner" ON organizations FOR UPDATE USING (id = get_user_org_id() AND get_user_role() = 'owner');

-- users
CREATE POLICY "users_select" ON users FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "users_update_self" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);

-- events
CREATE POLICY "events_select_org" ON events
  FOR SELECT USING (organization_id = get_user_org_id());

CREATE POLICY "events_insert" ON events
  FOR INSERT WITH CHECK (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('owner','admin')
  );

CREATE POLICY "events_update" ON events
  FOR UPDATE USING (
    organization_id = get_user_org_id()
    AND get_user_role() IN ('owner','admin')
  );

CREATE POLICY "events_delete" ON events
  FOR DELETE USING (
    organization_id = get_user_org_id()
    AND get_user_role() = 'owner'
  );

-- registration_fields
CREATE POLICY "fields_select" ON registration_fields
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE organization_id = get_user_org_id())
  );

CREATE POLICY "fields_admin" ON registration_fields
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE organization_id = get_user_org_id())
    AND get_user_role() IN ('owner','admin')
  );

-- participants
CREATE POLICY "participants_select" ON participants
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE organization_id = get_user_org_id())
  );

CREATE POLICY "participants_update" ON participants
  FOR UPDATE USING (
    event_id IN (SELECT id FROM events WHERE organization_id = get_user_org_id())
  );

-- participant_field_values
CREATE POLICY "field_values_select" ON participant_field_values
  FOR SELECT USING (
    participant_id IN (
      SELECT p.id FROM participants p
      JOIN events e ON e.id = p.event_id
      WHERE e.organization_id = get_user_org_id()
    )
  );

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
