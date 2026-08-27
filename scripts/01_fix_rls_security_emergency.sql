-- ==============================================================================
-- MIGUEL SECURITY FRAMEWORK - EMERGENCY RLS FIX (STOP-THE-LINE)
-- Execute este script no SQL Editor do seu Supabase O MAIS RÁPIDO POSSÍVEL.
-- ==============================================================================

-- 1. Remoção do acesso ANÔNIMO (Público) de todas as tabelas
-- Isso impede que qualquer pessoa não logada leia, apague ou insira dados.

-- Tabela: locations
DROP POLICY IF EXISTS "anon_select_locations" ON locations;
DROP POLICY IF EXISTS "anon_insert_locations" ON locations;
DROP POLICY IF EXISTS "anon_update_locations" ON locations;
DROP POLICY IF EXISTS "anon_delete_locations" ON locations;

CREATE POLICY "auth_select_locations" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_locations" ON locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_locations" ON locations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_locations" ON locations FOR DELETE TO authenticated USING (true);

-- Tabela: categories
DROP POLICY IF EXISTS "anon_select_categories" ON categories;
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;

CREATE POLICY "auth_select_categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_categories" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_categories" ON categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_categories" ON categories FOR DELETE TO authenticated USING (true);

-- Tabela: assets
DROP POLICY IF EXISTS "anon_select_assets" ON assets;
DROP POLICY IF EXISTS "anon_insert_assets" ON assets;
DROP POLICY IF EXISTS "anon_update_assets" ON assets;
DROP POLICY IF EXISTS "anon_delete_assets" ON assets;

CREATE POLICY "auth_select_assets" ON assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_assets" ON assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_assets" ON assets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_assets" ON assets FOR DELETE TO authenticated USING (true);

-- Tabela: asset_movements
DROP POLICY IF EXISTS "anon_select_movements" ON asset_movements;
DROP POLICY IF EXISTS "anon_insert_movements" ON asset_movements;
DROP POLICY IF EXISTS "anon_update_movements" ON asset_movements;
DROP POLICY IF EXISTS "anon_delete_movements" ON asset_movements;

CREATE POLICY "auth_select_movements" ON asset_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_movements" ON asset_movements FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_movements" ON asset_movements FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_movements" ON asset_movements FOR DELETE TO authenticated USING (true);

-- Tabela: document_categories
DROP POLICY IF EXISTS "anon_select_doc_categories" ON document_categories;
DROP POLICY IF EXISTS "anon_insert_doc_categories" ON document_categories;
DROP POLICY IF EXISTS "anon_update_doc_categories" ON document_categories;
DROP POLICY IF EXISTS "anon_delete_doc_categories" ON document_categories;

CREATE POLICY "auth_select_doc_categories" ON document_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_doc_categories" ON document_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_doc_categories" ON document_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_doc_categories" ON document_categories FOR DELETE TO authenticated USING (true);

-- Tabela: documents
DROP POLICY IF EXISTS "anon_select_documents" ON documents;
DROP POLICY IF EXISTS "anon_insert_documents" ON documents;
DROP POLICY IF EXISTS "anon_update_documents" ON documents;
DROP POLICY IF EXISTS "anon_delete_documents" ON documents;

CREATE POLICY "auth_select_documents" ON documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_documents" ON documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_documents" ON documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_documents" ON documents FOR DELETE TO authenticated USING (true);

-- Tabela: user_accesses
DROP POLICY IF EXISTS "anon_select_user_accesses" ON user_accesses;
DROP POLICY IF EXISTS "anon_insert_user_accesses" ON user_accesses;
DROP POLICY IF EXISTS "anon_update_user_accesses" ON user_accesses;
DROP POLICY IF EXISTS "anon_delete_user_accesses" ON user_accesses;

CREATE POLICY "auth_select_user_accesses" ON user_accesses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_user_accesses" ON user_accesses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_user_accesses" ON user_accesses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_user_accesses" ON user_accesses FOR DELETE TO authenticated USING (true);

-- IMPORTANTE:
-- Este script faz a contenção imediata (Tira o acesso público da internet).
-- Na Fase 2 da auditoria, criaremos políticas ainda mais finas baseadas nas Roles (Admin, Gestor, Consulta).
