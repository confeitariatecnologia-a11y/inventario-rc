-- ============================================================
-- SCRIPT DE POLÍTICAS RLS E ADMIN PARA USER_ACCESSES
-- Execute no SQL Editor do Supabase Dashboard (https://supabase.com)
-- ============================================================

-- 1. Habilitar RLS na tabela user_accesses
ALTER TABLE user_accesses ENABLE ROW LEVEL SECURITY;

-- 2. Permitir leitura, inserção, atualização e deleção no user_accesses
DROP POLICY IF EXISTS "Permitir leitura de permissões" ON user_accesses;
CREATE POLICY "Permitir leitura de permissões" ON user_accesses FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir inserção de acessos" ON user_accesses;
CREATE POLICY "Permitir inserção de acessos" ON user_accesses FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de acessos" ON user_accesses;
CREATE POLICY "Permitir atualização de acessos" ON user_accesses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusão de acessos" ON user_accesses;
CREATE POLICY "Permitir exclusão de acessos" ON user_accesses FOR DELETE TO anon, authenticated USING (true);

-- 3. Garantir que o administrador exista
INSERT INTO user_accesses (full_name, email, role, is_active, scope, can_manage_users)
VALUES (
    'Administrador',
    'supervisor.reis.ti@gmail.com',
    'admin',
    true,
    'global',
    true
)
ON CONFLICT (email) DO UPDATE
SET role = 'admin',
    is_active = true,
    scope = 'global',
    can_manage_users = true,
    full_name = 'Administrador';