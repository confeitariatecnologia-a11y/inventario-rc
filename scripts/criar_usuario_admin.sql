-- ============================================================
-- Script para criar um usuário administrador no Supabase
-- Execute no SQL Editor do Supabase (https://supabase.com)
-- ============================================================

-- 1. Habilitar RLS na tabela user_accesses
ALTER TABLE user_accesses ENABLE ROW LEVEL SECURITY;

-- 2. Permitir que qualquer usuário autenticado consulte permissões
DROP POLICY IF EXISTS "Permitir leitura de permissões" ON user_accesses;
CREATE POLICY "Permitir leitura de permissões"
ON user_accesses FOR SELECT
TO authenticated
USING (true);

-- 3. Inserir o usuário na tabela user_accesses (com e-mail correto)
INSERT INTO user_accesses (full_name, email, role, is_active)
VALUES (
    'Administrador',
    'supervisor.reis.ti@gmail.com',
    'admin',
    true
)
ON CONFLICT (email) DO UPDATE
SET role = 'admin',
    is_active = true,
    full_name = 'Administrador';