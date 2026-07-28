-- ============================================================
-- SCRIPT PARA CRIAR USUÁRIO ADMIN
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================
-- DESABILITA RLS TEMPORARIAMENTE PARA FAZER A INSERÇÃO
ALTER TABLE user_accesses DISABLE ROW LEVEL SECURITY;
-- INSERE O USUÁRIO ADMIN
INSERT INTO user_accesses (full_name, email, role, is_active)
VALUES (
        'Administrador',
        'supervisorsupervisor.reis.ti@gmail.com',
        'admin',
        true
    ) ON CONFLICT (email) DO
UPDATE
SET role = 'admin',
    is_active = true,
    full_name = 'Administrador';
-- REATIVA O RLS
ALTER TABLE user_accesses ENABLE ROW LEVEL SECURITY;