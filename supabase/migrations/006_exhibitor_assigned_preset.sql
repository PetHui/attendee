-- Tilldelad montertyp per utställare
ALTER TABLE exhibitors
  ADD COLUMN IF NOT EXISTS assigned_preset_id UUID REFERENCES booth_size_presets(id) ON DELETE SET NULL;
