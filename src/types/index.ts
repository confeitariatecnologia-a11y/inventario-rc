export type AssetStatus = 'operacional' | 'manutencao' | 'baixado' | 'emprestado';

export type LocationType = 'loja' | 'industria' | 'escritorio';

export type MovementType = 'status_change' | 'location_change' | 'maintenance' | 'note';

export type DocumentType = 'sop' | 'technical';

export type DocumentStatus = 'rascunho' | 'ativo' | 'arquivado';

export type AccessRole = 'admin' | 'gestor' | 'consulta';

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
  previous_value: string | null;
  new_value: string | null;
  description: string | null;
  performed_by: string | null;
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

export interface UserAccess {
  id: string;
  full_name: string;
  email: string;
  role: AccessRole;
  location_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  location?: Location | null;
}
