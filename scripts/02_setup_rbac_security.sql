-- ==============================================================================
-- MIGUEL SECURITY FRAMEWORK - FASE 2: RBAC (Role-Based Access Control)
-- Execute este script no SQL Editor do Supabase.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Funções Auxiliares de Segurança (Security Definer)
-- Estas funções rodam com privilégio elevado apenas para checar a role do usuário,
-- evitando loops infinitos na tabela user_accesses.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.user_accesses 
  WHERE email = auth.jwt() ->> 'email' 
  AND is_active = true 
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT public.get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_gestor_or_admin()
RETURNS boolean AS $$
  SELECT public.get_user_role() IN ('admin', 'gestor');
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------------------------
-- 2. Remoção das políticas provisórias de emergência
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "auth_select_locations" ON locations;
DROP POLICY IF EXISTS "auth_insert_locations" ON locations;
DROP POLICY IF EXISTS "auth_update_locations" ON locations;
DROP POLICY IF EXISTS "auth_delete_locations" ON locations;

DROP POLICY IF EXISTS "auth_select_categories" ON categories;
DROP POLICY IF EXISTS "auth_insert_categories" ON categories;
DROP POLICY IF EXISTS "auth_update_categories" ON categories;
DROP POLICY IF EXISTS "auth_delete_categories" ON categories;

DROP POLICY IF EXISTS "auth_select_assets" ON assets;
DROP POLICY IF EXISTS "auth_insert_assets" ON assets;
DROP POLICY IF EXISTS "auth_update_assets" ON assets;
DROP POLICY IF EXISTS "auth_delete_assets" ON assets;

DROP POLICY IF EXISTS "auth_select_movements" ON asset_movements;
DROP POLICY IF EXISTS "auth_insert_movements" ON asset_movements;
DROP POLICY IF EXISTS "auth_update_movements" ON asset_movements;
DROP POLICY IF EXISTS "auth_delete_movements" ON asset_movements;

DROP POLICY IF EXISTS "auth_select_doc_categories" ON document_categories;
DROP POLICY IF EXISTS "auth_insert_doc_categories" ON document_categories;
DROP POLICY IF EXISTS "auth_update_doc_categories" ON document_categories;
DROP POLICY IF EXISTS "auth_delete_doc_categories" ON document_categories;

DROP POLICY IF EXISTS "auth_select_documents" ON documents;
DROP POLICY IF EXISTS "auth_insert_documents" ON documents;
DROP POLICY IF EXISTS "auth_update_documents" ON documents;
DROP POLICY IF EXISTS "auth_delete_documents" ON documents;

DROP POLICY IF EXISTS "auth_select_user_accesses" ON user_accesses;
DROP POLICY IF EXISTS "auth_insert_user_accesses" ON user_accesses;
DROP POLICY IF EXISTS "auth_update_user_accesses" ON user_accesses;
DROP POLICY IF EXISTS "auth_delete_user_accesses" ON user_accesses;

-- ------------------------------------------------------------------------------
-- 3. Novas Políticas de Acesso Restrito (RBAC)
-- ------------------------------------------------------------------------------

-- Tabela: user_accesses (Usuários)
CREATE POLICY "users_read_own_or_admin" ON user_accesses FOR SELECT TO authenticated
USING ( email = auth.jwt()->>'email' OR public.is_admin() );

CREATE POLICY "admin_insert_users" ON user_accesses FOR INSERT TO authenticated
WITH CHECK ( public.is_admin() );

CREATE POLICY "admin_update_users" ON user_accesses FOR UPDATE TO authenticated
USING ( public.is_admin() ) WITH CHECK ( public.is_admin() );

CREATE POLICY "admin_delete_users" ON user_accesses FOR DELETE TO authenticated
USING ( public.is_admin() );

-- Tabelas Gerais Compartilhadas (locations, categories, document_categories)
-- Leitura para todos, Escrita para Gestor/Admin, Deleção só para Admin

CREATE POLICY "read_locations_all" ON locations FOR SELECT TO authenticated USING ( true );
CREATE POLICY "write_locations_gestor_admin" ON locations FOR INSERT TO authenticated WITH CHECK ( public.is_gestor_or_admin() );
CREATE POLICY "update_locations_gestor_admin" ON locations FOR UPDATE TO authenticated USING ( public.is_gestor_or_admin() );
CREATE POLICY "delete_locations_admin" ON locations FOR DELETE TO authenticated USING ( public.is_admin() );

CREATE POLICY "read_categories_all" ON categories FOR SELECT TO authenticated USING ( true );
CREATE POLICY "write_categories_gestor_admin" ON categories FOR INSERT TO authenticated WITH CHECK ( public.is_gestor_or_admin() );
CREATE POLICY "update_categories_gestor_admin" ON categories FOR UPDATE TO authenticated USING ( public.is_gestor_or_admin() );
CREATE POLICY "delete_categories_admin" ON categories FOR DELETE TO authenticated USING ( public.is_admin() );

CREATE POLICY "read_doccat_all" ON document_categories FOR SELECT TO authenticated USING ( true );
CREATE POLICY "write_doccat_gestor_admin" ON document_categories FOR INSERT TO authenticated WITH CHECK ( public.is_gestor_or_admin() );
CREATE POLICY "update_doccat_gestor_admin" ON document_categories FOR UPDATE TO authenticated USING ( public.is_gestor_or_admin() );
CREATE POLICY "delete_doccat_admin" ON document_categories FOR DELETE TO authenticated USING ( public.is_admin() );

-- Tabela: assets (Ativos) e documents (Documentos)
-- Leitura para todos, Escrita para Gestor/Admin, Deleção só para Admin
CREATE POLICY "read_assets_all" ON assets FOR SELECT TO authenticated USING ( true );
CREATE POLICY "write_assets_gestor_admin" ON assets FOR INSERT TO authenticated WITH CHECK ( public.is_gestor_or_admin() );
CREATE POLICY "update_assets_gestor_admin" ON assets FOR UPDATE TO authenticated USING ( public.is_gestor_or_admin() );
CREATE POLICY "delete_assets_admin" ON assets FOR DELETE TO authenticated USING ( public.is_admin() );

CREATE POLICY "read_documents_all" ON documents FOR SELECT TO authenticated USING ( true );
CREATE POLICY "write_documents_gestor_admin" ON documents FOR INSERT TO authenticated WITH CHECK ( public.is_gestor_or_admin() );
CREATE POLICY "update_documents_gestor_admin" ON documents FOR UPDATE TO authenticated USING ( public.is_gestor_or_admin() );
CREATE POLICY "delete_documents_admin" ON documents FOR DELETE TO authenticated USING ( public.is_admin() );

-- Tabela: asset_movements (Movimentações)
-- Leitura para todos, Escrita para Gestor/Admin, NINGUÉM pode deletar (Audit Trail Intocável)
CREATE POLICY "read_movements_all" ON asset_movements FOR SELECT TO authenticated USING ( true );
CREATE POLICY "write_movements_gestor_admin" ON asset_movements FOR INSERT TO authenticated WITH CHECK ( public.is_gestor_or_admin() );
CREATE POLICY "update_movements_gestor_admin" ON asset_movements FOR UPDATE TO authenticated USING ( public.is_gestor_or_admin() );
-- Não há política de DELETE para asset_movements. Isso garante imutabilidade da auditoria.
