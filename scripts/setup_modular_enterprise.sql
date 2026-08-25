-- ==============================================================================
-- SISTEMA DE GESTÃO PATRIMONIAL & ORDENS DE SERVIÇO - GRUPO RICHESSE
-- MIGRATION MODULAR ENTERPRISE: Equipes, OS, SLA, Auditoria e TI
-- ==============================================================================

BEGIN;

-- 1. Equipes Técnicas
CREATE TABLE IF NOT EXISTS technical_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text,
  color text DEFAULT '#2563eb',
  target_sla_hours integer DEFAULT 24,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Inserir Equipes Padrão se não existirem
INSERT INTO technical_teams (name, specialty, color, target_sla_hours)
VALUES 
  ('Equipe TI & Redes', 'Computadores, Servidores e Conectividade', '#2563eb', 12),
  ('Equipe Refrigeração & Climatização', 'Ar Condicionado, Câmaras Frias e Balcões', '#059669', 24),
  ('Equipe Máquinas & Fornos', 'Equipamentos Industriais de Produção', '#d97706', 24),
  ('Equipe Manutenção Predial & Frota', 'Estrutura, Veículos e Hidráulica', '#7c3aed', 48)
ON CONFLICT DO NOTHING;

-- 2. Atualizar user_accesses com equipe e permissões modulares
ALTER TABLE user_accesses 
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES technical_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS module_inventory boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS module_work_orders boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS module_audit boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS module_it boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS module_reports boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS module_settings boolean DEFAULT true;

-- 3. Tabela de Ordens de Serviço (Work Orders)
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  team_id uuid REFERENCES technical_teams(id) ON DELETE SET NULL,
  technician_id uuid REFERENCES user_accesses(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'critica')),
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_atendimento', 'aguardando_peca', 'concluida', 'cancelada')),
  sla_deadline timestamptz,
  opened_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  parts_cost numeric DEFAULT 0,
  labor_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  parts_replaced text,
  checkin_lat numeric,
  checkin_lng numeric,
  checkin_time timestamptz,
  checkout_lat numeric,
  checkout_lng numeric,
  checkout_time timestamptz,
  photos jsonb DEFAULT '[]'::jsonb,
  invoice_url text,
  manager_signature text,
  resolution_notes text,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Sessões de Auditoria Física de Inventário (Inventariança)
CREATE TABLE IF NOT EXISTS audit_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  auditor_id uuid REFERENCES user_accesses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'finalizada', 'cancelada')),
  total_expected integer DEFAULT 0,
  total_found integer DEFAULT 0,
  total_missing integer DEFAULT 0,
  total_divergent integer DEFAULT 0,
  notes text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- 5. Itens da Auditoria
CREATE TABLE IF NOT EXISTS audit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES audit_sessions(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  scanned_at timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('conferido', 'faltante', 'loja_errada')),
  found_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  notes text
);

-- 6. Módulo de TI: Licenças de Software
CREATE TABLE IF NOT EXISTS it_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  software_name text NOT NULL,
  vendor text,
  license_type text DEFAULT 'anual' CHECK (license_type IN ('mensal', 'anual', 'vitalicia', 'por_usuario')),
  license_key text,
  seats_total integer DEFAULT 1,
  seats_used integer DEFAULT 0,
  cost numeric DEFAULT 0,
  renewal_date date,
  status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'expirando', 'expirado', 'cancelado')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Atribuições de Licença a Computadores
CREATE TABLE IF NOT EXISTS it_license_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid REFERENCES it_licenses(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  assigned_to text,
  assigned_at timestamptz DEFAULT now()
);

-- Habilitar RLS e Políticas Permissivas para a chave autenticada/anon
ALTER TABLE technical_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_license_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read technical_teams" ON technical_teams FOR SELECT USING (true);
CREATE POLICY "Allow public all technical_teams" ON technical_teams FOR ALL USING (true);

CREATE POLICY "Allow public read work_orders" ON work_orders FOR SELECT USING (true);
CREATE POLICY "Allow public all work_orders" ON work_orders FOR ALL USING (true);

CREATE POLICY "Allow public read audit_sessions" ON audit_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public all audit_sessions" ON audit_sessions FOR ALL USING (true);

CREATE POLICY "Allow public read audit_items" ON audit_items FOR SELECT USING (true);
CREATE POLICY "Allow public all audit_items" ON audit_items FOR ALL USING (true);

CREATE POLICY "Allow public read it_licenses" ON it_licenses FOR SELECT USING (true);
CREATE POLICY "Allow public all it_licenses" ON it_licenses FOR ALL USING (true);

CREATE POLICY "Allow public read it_license_assignments" ON it_license_assignments FOR SELECT USING (true);
CREATE POLICY "Allow public all it_license_assignments" ON it_license_assignments FOR ALL USING (true);

COMMIT;
