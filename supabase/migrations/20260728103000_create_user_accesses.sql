/*
# User accesses

Stores access records managed from the Settings page. This table is the
application-side access directory; Supabase Auth login enforcement can be
layered on top of it when the app is ready to leave bench/testing.
*/

CREATE TABLE IF NOT EXISTS user_accesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 120),
  email text NOT NULL UNIQUE CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  role text NOT NULL DEFAULT 'consulta' CHECK (role IN ('admin', 'gestor', 'consulta')),
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_accesses_role_idx ON user_accesses(role);
CREATE INDEX IF NOT EXISTS user_accesses_location_idx ON user_accesses(location_id);
CREATE INDEX IF NOT EXISTS user_accesses_active_idx ON user_accesses(is_active);

ALTER TABLE user_accesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_user_accesses" ON user_accesses;
CREATE POLICY "anon_select_user_accesses" ON user_accesses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_user_accesses" ON user_accesses;
CREATE POLICY "anon_insert_user_accesses" ON user_accesses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_user_accesses" ON user_accesses;
CREATE POLICY "anon_update_user_accesses" ON user_accesses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_user_accesses" ON user_accesses;
CREATE POLICY "anon_delete_user_accesses" ON user_accesses FOR DELETE TO anon, authenticated USING (true);
