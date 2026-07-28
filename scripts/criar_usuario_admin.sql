-- ============================================================
-- Script para criar um usuário administrador no Supabase
-- Execute no SQL Editor do Supabase (https://supabase.com)
-- ============================================================
-- 1. Criar o usuário no Auth (você precisa fazer isso manualmente)
--    Vá em Authentication > Users > Invite user ou Add user
--    Email: SEU_EMAIL
--    Senha: SUA_SENHA
-- 2. Inserir o usuário na tabela user_accesses (execute abaixo)
-- Substitua 'SUA_SENHA_AQUI' pela senha desejada antes de executar
-- 1. No SQL Editor do Supabase, execute:
-- 2. Depois execute este comando para liberar o acesso:
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