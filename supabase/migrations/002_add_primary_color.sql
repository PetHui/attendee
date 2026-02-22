-- Lägg till primärfärg för organisationer
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_color TEXT;
