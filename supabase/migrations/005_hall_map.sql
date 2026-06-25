-- ============================================================
-- Attendee – Hallkarta
-- ============================================================

-- Hallkartsinställningar på events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS map_image_url    TEXT,
  ADD COLUMN IF NOT EXISTS map_aspect_ratio FLOAT DEFAULT 1.5;

-- Monterpositioner på exhibitors
ALTER TABLE exhibitors
  ADD COLUMN IF NOT EXISTS map_x     FLOAT,
  ADD COLUMN IF NOT EXISTS map_y     FLOAT,
  ADD COLUMN IF NOT EXISTS map_w     FLOAT,
  ADD COLUMN IF NOT EXISTS map_h     FLOAT,
  ADD COLUMN IF NOT EXISTS map_color TEXT;

-- Storlekspresets per event
CREATE TABLE IF NOT EXISTS booth_size_presets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  width_pct   FLOAT NOT NULL,
  height_pct  FLOAT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#a8d5b5',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE booth_size_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presets_select" ON booth_size_presets
  FOR SELECT USING (user_owns_event(event_id));

CREATE POLICY "presets_admin" ON booth_size_presets
  FOR ALL USING (
    user_owns_event(event_id)
    AND get_user_role() IN ('owner','admin')
  );

CREATE POLICY "presets_public_select" ON booth_size_presets
  FOR SELECT TO anon USING (
    event_id IN (SELECT id FROM events WHERE status = 'published')
  );

-- Tillägg: Fritext-element på kartan
CREATE TABLE IF NOT EXISTS map_elements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  x           FLOAT NOT NULL DEFAULT 10,
  y           FLOAT NOT NULL DEFAULT 10,
  w           FLOAT NOT NULL DEFAULT 15,
  h           FLOAT NOT NULL DEFAULT 5,
  font_size   TEXT NOT NULL DEFAULT 'sm',
  text_color  TEXT NOT NULL DEFAULT '#374151',
  bg_color    TEXT,
  bold        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE map_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "elements_select" ON map_elements
  FOR SELECT USING (user_owns_event(event_id));

CREATE POLICY "elements_admin" ON map_elements
  FOR ALL USING (
    user_owns_event(event_id)
    AND get_user_role() IN ('owner','admin')
  );

CREATE POLICY "elements_public_select" ON map_elements
  FOR SELECT TO anon USING (
    event_id IN (SELECT id FROM events WHERE status = 'published')
  );
