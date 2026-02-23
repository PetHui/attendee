-- Add checkin_token to events table for token-based check-in access (no login required)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS checkin_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Generate tokens for any existing events that don't have one
UPDATE events SET checkin_token = gen_random_uuid() WHERE checkin_token IS NULL;

-- Make the column NOT NULL now that all rows have a value
ALTER TABLE events ALTER COLUMN checkin_token SET NOT NULL;
