ALTER TABLE events
  ADD COLUMN IF NOT EXISTS email_intro_text text,
  ADD COLUMN IF NOT EXISTS email_qr_instruction text,
  ADD COLUMN IF NOT EXISTS email_footer_note text;
