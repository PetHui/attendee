-- ============================================================
-- Attendee – Exhibitors (utställarmodul)
-- ============================================================

-- utställare
CREATE TABLE exhibitors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  company_name  TEXT NOT NULL,
  description   TEXT,
  website       TEXT,
  email         TEXT,
  phone         TEXT,
  booth_number  TEXT,
  status        TEXT NOT NULL CHECK (status IN ('draft','published')) DEFAULT 'draft',
  edit_token    UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- kontaktpersoner per utställare
CREATE TABLE exhibitor_contacts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exhibitor_id  UUID NOT NULL REFERENCES exhibitors(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  role          TEXT,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- faktureringsuppgifter per utställare (max en rad)
CREATE TABLE exhibitor_billing (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exhibitor_id      UUID UNIQUE NOT NULL REFERENCES exhibitors(id) ON DELETE CASCADE,
  company_name      TEXT,
  org_number        TEXT,
  vat_number        TEXT,
  billing_address   TEXT,
  billing_email     TEXT,
  billing_reference TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- erbjudanden per utställare
CREATE TABLE exhibitor_offers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exhibitor_id  UUID NOT NULL REFERENCES exhibitors(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- inlösta erbjudanden (besökare skannar hos utställare)
CREATE TABLE offer_redemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id        UUID NOT NULL REFERENCES exhibitor_offers(id) ON DELETE CASCADE,
  participant_id  UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  redeemed_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (offer_id, participant_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE exhibitors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibitor_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibitor_billing   ENABLE ROW LEVEL SECURITY;
ALTER TABLE exhibitor_offers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_redemptions   ENABLE ROW LEVEL SECURITY;

-- Hjälpfunktion: returnerar TRUE om autentiserad användare tillhör eventets organisation
CREATE OR REPLACE FUNCTION user_owns_event(p_event_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = p_event_id
      AND e.organization_id = get_user_org_id()
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- exhibitors
CREATE POLICY "exhibitors_select" ON exhibitors
  FOR SELECT USING (user_owns_event(event_id));

CREATE POLICY "exhibitors_insert" ON exhibitors
  FOR INSERT WITH CHECK (
    user_owns_event(event_id)
    AND get_user_role() IN ('owner','admin')
  );

CREATE POLICY "exhibitors_update" ON exhibitors
  FOR UPDATE USING (
    user_owns_event(event_id)
    AND get_user_role() IN ('owner','admin')
  );

CREATE POLICY "exhibitors_delete" ON exhibitors
  FOR DELETE USING (
    user_owns_event(event_id)
    AND get_user_role() IN ('owner','admin')
  );

-- exhibitor_contacts
CREATE POLICY "exhibitor_contacts_select" ON exhibitor_contacts
  FOR SELECT USING (
    exhibitor_id IN (SELECT id FROM exhibitors WHERE user_owns_event(event_id))
  );

CREATE POLICY "exhibitor_contacts_all" ON exhibitor_contacts
  FOR ALL USING (
    exhibitor_id IN (SELECT id FROM exhibitors WHERE user_owns_event(event_id))
    AND get_user_role() IN ('owner','admin')
  );

-- exhibitor_billing
CREATE POLICY "exhibitor_billing_select" ON exhibitor_billing
  FOR SELECT USING (
    exhibitor_id IN (SELECT id FROM exhibitors WHERE user_owns_event(event_id))
  );

CREATE POLICY "exhibitor_billing_all" ON exhibitor_billing
  FOR ALL USING (
    exhibitor_id IN (SELECT id FROM exhibitors WHERE user_owns_event(event_id))
    AND get_user_role() IN ('owner','admin')
  );

-- exhibitor_offers
CREATE POLICY "exhibitor_offers_select" ON exhibitor_offers
  FOR SELECT USING (
    exhibitor_id IN (SELECT id FROM exhibitors WHERE user_owns_event(event_id))
  );

CREATE POLICY "exhibitor_offers_all" ON exhibitor_offers
  FOR ALL USING (
    exhibitor_id IN (SELECT id FROM exhibitors WHERE user_owns_event(event_id))
    AND get_user_role() IN ('owner','admin')
  );

-- offer_redemptions
CREATE POLICY "offer_redemptions_select" ON offer_redemptions
  FOR SELECT USING (
    offer_id IN (
      SELECT o.id FROM exhibitor_offers o
      JOIN exhibitors e ON e.id = o.exhibitor_id
      WHERE user_owns_event(e.event_id)
    )
  );

CREATE POLICY "offer_redemptions_insert" ON offer_redemptions
  FOR INSERT WITH CHECK (
    offer_id IN (
      SELECT o.id FROM exhibitor_offers o
      JOIN exhibitors e ON e.id = o.exhibitor_id
      WHERE user_owns_event(e.event_id)
    )
  );
