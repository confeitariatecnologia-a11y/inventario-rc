export type AssetStatus = 'operacional' | 'manutencao' | 'baixado' | 'emprestado';

export type LocationType = 'loja' | 'industria' | 'escritorio';

export type MovementType = 'status_change' | 'location_change' | 'maintenance' | 'note';

export type DocumentType = 'sop' | 'technical';

export type DocumentStatus = 'rascunho' | 'ativo' | 'arquivado';

export type AccessRole = 'admin' | 'tecnico' | 'auditor' | 'gestor' | 'consulta';

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  address: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  created_at: string;
}

export interface Asset {
  id: string;
  name: string;
  asset_code: string;
  serial_number: string | null;
  category_id: string | null;
  location_id: string | null;
  status: AssetStatus;
  responsible: string | null;
  acquisition_date: string | null;
  acquisition_value: number | null;
  warranty_until: string | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  image_url: string | null;
  notes: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  location?: Location | null;
}

export interface AssetMovement {
  id: string;
  asset_id: string;
  type: MovementType;
  from_status?: AssetStatus | null;
  to_status?: AssetStatus | null;
  previous_value?: string | null;
  new_value?: string | null;
  description: string | null;
  performed_by?: string | null;
  created_at: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  type: DocumentType;
  created_at: string;
}

export interface Doc {
  id: string;
  title: string;
  slug: string;
  category_id: string | null;
  content: string;
  version: number;
  author: string | null;
  reviewed_by: string | null;
  review_date: string | null;
  tags: string[] | null;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  category?: DocumentCategory | null;
}

export interface TechnicalTeam {
  id: string;
  name: string;
  specialty: string | null;
  color: string | null;
  target_sla_hours: number;
  active: boolean;
  created_at: string;
}

export interface UserAccess {
  id: string;
  full_name: string;
  email: string;
  role: AccessRole;
  location_id: string | null;
  team_id?: string | null;
  phone?: string | null;
  is_active: boolean;
  notes: string | null;
  module_inventory?: boolean;
  module_work_orders?: boolean;
  module_audit?: boolean;
  module_it?: boolean;
  module_reports?: boolean;
  module_settings?: boolean;
  created_at: string;
  updated_at: string;
  location?: Location | null;
  team?: TechnicalTeam | null;
}

// ----------------------------------------------------
// ORDENS DE SERVIÇO & GESTÃO DE CAMPO
// ----------------------------------------------------
export type WorkOrderPriority = 'baixa' | 'normal' | 'alta' | 'critica';
export type WorkOrderStatus = 'aberta' | 'em_atendimento' | 'aguardando_peca' | 'concluida' | 'cancelada';

export interface WorkOrder {
  id: string;
  code: string;
  title: string;
  description: string | null;
  asset_id: string | null;
  location_id: string | null;
  team_id: string | null;
  technician_id: string | null;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  sla_deadline: string | null;
  opened_at: string;
  started_at: string | null;
  completed_at: string | null;
  parts_cost: number;
  labor_cost: number;
  total_cost: number;
  parts_replaced: string | null;
  checkin_lat: number | null;
  checkin_lng: number | null;
  checkin_time: string | null;
  checkout_lat: number | null;
  checkout_lng: number | null;
  checkout_time: string | null;
  photos: string[];
  invoice_url: string | null;
  manager_signature: string | null;
  resolution_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  asset?: Asset | null;
  location?: Location | null;
  team?: TechnicalTeam | null;
  technician?: UserAccess | null;
}

// ----------------------------------------------------
// AUDITORIA FÍSICA DE INVENTÁRIO (INVENTARIANÇA)
// ----------------------------------------------------
export type AuditStatus = 'em_andamento' | 'finalizada' | 'cancelada';
export type AuditItemStatus = 'conferido' | 'faltante' | 'loja_errada';

export interface AuditSession {
  id: string;
  code: string;
  location_id: string;
  auditor_id: string | null;
  status: AuditStatus;
  total_expected: number;
  total_found: number;
  total_missing: number;
  total_divergent: number;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  location?: Location | null;
  auditor?: UserAccess | null;
}

export interface AuditItem {
  id: string;
  session_id: string;
  asset_id: string;
  scanned_at: string;
  status: AuditItemStatus;
  found_location_id: string | null;
  notes: string | null;
  asset?: Asset | null;
}

// ----------------------------------------------------
// MÓDULO DE TI & LICENÇAS DE SOFTWARE
// ----------------------------------------------------
export type LicenseType = 'mensal' | 'anual' | 'vitalicia' | 'por_usuario';
export type LicenseStatus = 'ativo' | 'expirando' | 'expirado' | 'cancelado';

export interface ITLicense {
  id: string;
  software_name: string;
  vendor: string | null;
  license_type: LicenseType;
  license_key: string | null;
  seats_total: number;
  seats_used: number;
  cost: number;
  renewal_date: string | null;
  status: LicenseStatus;
  notes: string | null;
  created_at: string;
  assignments?: ITLicenseAssignment[];
}

export interface ITLicenseAssignment {
  id: string;
  license_id: string;
  asset_id: string | null;
  assigned_to: string | null;
  assigned_at: string;
  asset?: Asset | null;
}
