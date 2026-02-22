-- ============================================================
-- SEED DATA – Testorganisation
-- ============================================================
-- Steg 1: Kör denna fil i Supabase SQL-editor.
-- Steg 2: Skapa en auth-användare manuellt:
--         Authentication → Users → Add user
--         E-post: admin@test.se, valfritt lösenord
-- Steg 3: Kör INSERT för users-tabellen nedan med ditt auth-user-ID.
-- ============================================================

-- Organisation
INSERT INTO organizations (id, name, slug)
VALUES ('10000000-0000-0000-0000-000000000001', 'Test-organisationen', 'test-org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, organization_id, role, email, name)
VALUES (
  '9d2d6fcc-25ae-4ea9-8724-9e64fa6a8129',
  '10000000-0000-0000-0000-000000000001',
  'owner',
  'admin@test.se',
  'Test Admin'
) ON CONFLICT (id) DO NOTHING;

-- Testevent (30 dagar framåt)
INSERT INTO events (id, organization_id, title, description, location, starts_at, ends_at, max_participants, status)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'Teknikkonferens 2025',
  'En dag fylld av spännande föreläsningar om modern webbutveckling, AI och framtidens teknologi. Nätverka med branschens ledande experter och få inspiration för ditt nästa projekt.',
  'Stockholms Mässan, Mässvägen 1, Älvsjö',
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '30 days' + INTERVAL '8 hours',
  150,
  'published'
) ON CONFLICT (id) DO NOTHING;

-- Anmälningsfält
INSERT INTO registration_fields (id, event_id, label, field_type, required, sort_order)
VALUES
  ('10000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000002', 'Förnamn',   'text', TRUE,  1),
  ('10000000-0000-0000-0001-000000000002', '10000000-0000-0000-0000-000000000002', 'Efternamn', 'text', TRUE,  2),
  ('10000000-0000-0000-0001-000000000003', '10000000-0000-0000-0000-000000000002', 'E-post',    'text', TRUE,  3),
  ('10000000-0000-0000-0001-000000000004', '10000000-0000-0000-0000-000000000002', 'Företag / Organisation', 'text', FALSE, 4),
  ('10000000-0000-0000-0001-000000000007', '10000000-0000-0000-0000-000000000002', 'Jag godkänner att mina uppgifter behandlas', 'checkbox', TRUE, 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO registration_fields (id, event_id, label, field_type, required, options, sort_order)
VALUES
  ('10000000-0000-0000-0001-000000000005', '10000000-0000-0000-0000-000000000002', 'Roll', 'select', TRUE,
   '["Utvecklare", "Designer", "Produktchef", "Chef", "Annat"]'::jsonb, 5),
  ('10000000-0000-0000-0001-000000000006', '10000000-0000-0000-0000-000000000002', 'Kostpreferens', 'select', FALSE,
   '["Inga preferenser", "Vegetarisk", "Vegan", "Glutenfri", "Laktosfri"]'::jsonb, 6)
ON CONFLICT (id) DO NOTHING;

-- Testdeltagare
INSERT INTO participants (id, event_id, qr_code, checked_in_at, created_at)
VALUES
  ('10000000-0000-0000-0002-000000000001', '10000000-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '5 days'),
  ('10000000-0000-0000-0002-000000000002', '10000000-0000-0000-0000-000000000002',
   '22222222-2222-2222-2222-222222222222', NULL, NOW() - INTERVAL '4 days'),
  ('10000000-0000-0000-0002-000000000003', '10000000-0000-0000-0000-000000000002',
   '33333333-3333-3333-3333-333333333333', NULL, NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Fältvärden – Anna Andersson (incheckad)
INSERT INTO participant_field_values (participant_id, field_id, value) VALUES
  ('10000000-0000-0000-0002-000000000001', '10000000-0000-0000-0001-000000000001', 'Anna'),
  ('10000000-0000-0000-0002-000000000001', '10000000-0000-0000-0001-000000000002', 'Andersson'),
  ('10000000-0000-0000-0002-000000000001', '10000000-0000-0000-0001-000000000003', 'anna.andersson@test.se'),
  ('10000000-0000-0000-0002-000000000001', '10000000-0000-0000-0001-000000000004', 'TechCorp AB'),
  ('10000000-0000-0000-0002-000000000001', '10000000-0000-0000-0001-000000000005', 'Utvecklare'),
  ('10000000-0000-0000-0002-000000000001', '10000000-0000-0000-0001-000000000006', 'Vegetarisk'),
  ('10000000-0000-0000-0002-000000000001', '10000000-0000-0000-0001-000000000007', 'true')
ON CONFLICT DO NOTHING;

-- Fältvärden – Erik Eriksson (ej incheckad)
INSERT INTO participant_field_values (participant_id, field_id, value) VALUES
  ('10000000-0000-0000-0002-000000000002', '10000000-0000-0000-0001-000000000001', 'Erik'),
  ('10000000-0000-0000-0002-000000000002', '10000000-0000-0000-0001-000000000002', 'Eriksson'),
  ('10000000-0000-0000-0002-000000000002', '10000000-0000-0000-0001-000000000003', 'erik.eriksson@test.se'),
  ('10000000-0000-0000-0002-000000000002', '10000000-0000-0000-0001-000000000005', 'Designer'),
  ('10000000-0000-0000-0002-000000000002', '10000000-0000-0000-0001-000000000007', 'true')
ON CONFLICT DO NOTHING;

-- Fältvärden – Maria Larsson (ej incheckad)
INSERT INTO participant_field_values (participant_id, field_id, value) VALUES
  ('10000000-0000-0000-0002-000000000003', '10000000-0000-0000-0001-000000000001', 'Maria'),
  ('10000000-0000-0000-0002-000000000003', '10000000-0000-0000-0001-000000000002', 'Larsson'),
  ('10000000-0000-0000-0002-000000000003', '10000000-0000-0000-0001-000000000003', 'maria.larsson@test.se'),
  ('10000000-0000-0000-0002-000000000003', '10000000-0000-0000-0001-000000000004', 'StartupXYZ'),
  ('10000000-0000-0000-0002-000000000003', '10000000-0000-0000-0001-000000000005', 'Chef'),
  ('10000000-0000-0000-0002-000000000003', '10000000-0000-0000-0001-000000000006', 'Vegan'),
  ('10000000-0000-0000-0002-000000000003', '10000000-0000-0000-0001-000000000007', 'true')
ON CONFLICT DO NOTHING;
