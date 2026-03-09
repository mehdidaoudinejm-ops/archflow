-- ArchFlow — Setup Supabase Storage
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase (Settings > SQL Editor)
-- OU via : supabase db push (si CLI configuré)

-- ─────────────────────────────────────────────
-- 1. Création des buckets
-- ─────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  -- Documents administratifs entreprises (kbis, décennale, rc pro, rib, urssaf)
  -- Upload via service role (API server) → RLS bypassed côté upload
  -- Read : public (URL directe stockée en DB, accessible depuis l'interface archi)
  ('admin-docs',     'admin-docs',     true, 10485760),  -- 10 Mo

  -- Documents DCE (plans, CCTP, notices, photos)
  -- Upload via browser client (anon key) → RLS requises
  -- Read : public
  ('dce-documents',  'dce-documents',  true, 52428800),  -- 50 Mo

  -- Logos des agences
  -- Upload via service role (API server)
  -- Read : public
  ('logos',          'logos',          true, 2097152)     -- 2 Mo

ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- 2. Policies RLS — admin-docs
-- (upload via service role → pas de policy INSERT nécessaire)
-- ─────────────────────────────────────────────

DROP POLICY IF EXISTS "admin-docs public read" ON storage.objects;
CREATE POLICY "admin-docs public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'admin-docs');

-- ─────────────────────────────────────────────
-- 3. Policies RLS — dce-documents
-- (upload depuis le browser avec le client anon → policy INSERT nécessaire)
-- ─────────────────────────────────────────────

DROP POLICY IF EXISTS "dce-documents authenticated upload" ON storage.objects;
CREATE POLICY "dce-documents authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'dce-documents');

DROP POLICY IF EXISTS "dce-documents public read" ON storage.objects;
CREATE POLICY "dce-documents public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'dce-documents');

DROP POLICY IF EXISTS "dce-documents authenticated delete" ON storage.objects;
CREATE POLICY "dce-documents authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'dce-documents');

-- ─────────────────────────────────────────────
-- 4. Policies RLS — logos
-- (upload via service role → pas de policy INSERT nécessaire)
-- ─────────────────────────────────────────────

DROP POLICY IF EXISTS "logos public read" ON storage.objects;
CREATE POLICY "logos public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');
