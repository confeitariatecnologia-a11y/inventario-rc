-- ==============================================================================
-- SCHEMA COMPLETO E CONFIGURAÇÃO INICIAL - RICHESSE INVENTÁRIO
-- Execute este script no SQL Editor do seu Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Tabela de Localizações (Lojas, Indústria, Escritório)
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'loja' CHECK (type IN ('loja', 'industria', 'escritorio')),
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_locations" ON locations;
CREATE POLICY "anon_select_locations" ON locations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_locations" ON locations;
CREATE POLICY "anon_insert_locations" ON locations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_locations" ON locations;
CREATE POLICY "anon_update_locations" ON locations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_locations" ON locations;
CREATE POLICY "anon_delete_locations" ON locations FOR DELETE TO anon, authenticated USING (true);

-- 2. Tabela de Categorias de Ativos
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text,
  color text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE TO anon, authenticated USING (true);

-- 3. Tabela de Ativos
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  asset_code text UNIQUE NOT NULL,
  serial_number text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'operacional' CHECK (status IN ('operacional', 'manutencao', 'baixado', 'emprestado')),
  responsible text,
  acquisition_date date,
  acquisition_value numeric(12,2),
  warranty_until date,
  last_maintenance date,
  next_maintenance date,
  image_url text,
  notes text,
  qr_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assets_status_idx ON assets(status);
CREATE INDEX IF NOT EXISTS assets_category_idx ON assets(category_id);
CREATE INDEX IF NOT EXISTS assets_location_idx ON assets(location_id);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_assets" ON assets;
CREATE POLICY "anon_select_assets" ON assets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_assets" ON assets;
CREATE POLICY "anon_insert_assets" ON assets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_assets" ON assets;
CREATE POLICY "anon_update_assets" ON assets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_assets" ON assets;
CREATE POLICY "anon_delete_assets" ON assets FOR DELETE TO anon, authenticated USING (true);

-- 4. Tabela de Histórico de Movimentações
CREATE TABLE IF NOT EXISTS asset_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('status_change', 'location_change', 'maintenance', 'note')),
  previous_value text,
  new_value text,
  description text,
  performed_by text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS movements_asset_idx ON asset_movements(asset_id);
CREATE INDEX IF NOT EXISTS movements_created_idx ON asset_movements(created_at DESC);

ALTER TABLE asset_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_movements" ON asset_movements;
CREATE POLICY "anon_select_movements" ON asset_movements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_movements" ON asset_movements;
CREATE POLICY "anon_insert_movements" ON asset_movements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_movements" ON asset_movements;
CREATE POLICY "anon_update_movements" ON asset_movements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_movements" ON asset_movements;
CREATE POLICY "anon_delete_movements" ON asset_movements FOR DELETE TO anon, authenticated USING (true);

-- 5. Documentos e Procedimentos
CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'sop' CHECK (type IN ('sop', 'technical')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_doc_categories" ON document_categories;
CREATE POLICY "anon_select_doc_categories" ON document_categories FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_doc_categories" ON document_categories;
CREATE POLICY "anon_insert_doc_categories" ON document_categories FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_doc_categories" ON document_categories;
CREATE POLICY "anon_update_doc_categories" ON document_categories FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_doc_categories" ON document_categories;
CREATE POLICY "anon_delete_doc_categories" ON document_categories FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  category_id uuid REFERENCES document_categories(id) ON DELETE SET NULL,
  content text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  author text,
  reviewed_by text,
  review_date date,
  tags text[],
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('rascunho', 'ativo', 'arquivado')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category_id);
CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(status);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_documents" ON documents;
CREATE POLICY "anon_select_documents" ON documents FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_documents" ON documents;
CREATE POLICY "anon_insert_documents" ON documents FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_documents" ON documents;
CREATE POLICY "anon_update_documents" ON documents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_documents" ON documents;
CREATE POLICY "anon_delete_documents" ON documents FOR DELETE TO anon, authenticated USING (true);

-- 6. Tabela de Permissões de Usuários (user_accesses)
CREATE TABLE IF NOT EXISTS user_accesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 120),
  email text NOT NULL UNIQUE CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  role text NOT NULL DEFAULT 'consulta' CHECK (role IN ('admin', 'gestor', 'consulta')),
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  scope text DEFAULT 'global' NOT NULL,
  can_manage_users boolean NOT NULL DEFAULT true,
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

-- 7. Inserir permissões para os seus e-mails como Administrador
INSERT INTO user_accesses (full_name, email, role, scope, can_manage_users, is_active)
VALUES 
  ('Matheus Reis', 'matheusbreis19@gmail.com', 'admin', 'global', true, true),
  ('Supervisor TI', 'supervisor.reis.ti@gmail.com', 'admin', 'global', true, true)
ON CONFLICT (email) DO UPDATE
SET role = 'admin', scope = 'global', can_manage_users = true, is_active = true;
