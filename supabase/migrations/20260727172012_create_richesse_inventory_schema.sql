/*
# Richesse Inventory & Documentation System — Full Schema

## Overview
Creates the complete database schema for the Grupo Richesse asset inventory
and documentation management system.

## New Tables

### 1. `locations`
Stores physical locations (stores, units, departments) where assets are deployed.
- `id` (uuid, PK)
- `name` (text) — display name, e.g. "Loja Centro"
- `type` (text) — 'loja' | 'industria' | 'escritorio'
- `address` (text, nullable)
- `created_at` (timestamptz)

### 2. `categories`
Asset taxonomy — extensible by type.
- `id` (uuid, PK)
- `name` (text) — e.g. "Impressoras", "Balanças"
- `icon` (text, nullable) — icon name hint for UI
- `color` (text, nullable) — hex color for UI
- `created_at` (timestamptz)

### 3. `assets`
Core table — every physical or software asset.
- `id` (uuid, PK)
- `name` (text) — asset display name
- `asset_code` (text, unique) — human-readable ID like "PRT001"
- `serial_number` (text, nullable)
- `category_id` (uuid, FK → categories)
- `location_id` (uuid, FK → locations)
- `status` (text) — 'operacional' | 'manutencao' | 'baixado' | 'emprestado'
- `responsible` (text, nullable) — name of responsible person
- `acquisition_date` (date, nullable)
- `acquisition_value` (numeric, nullable)
- `warranty_until` (date, nullable)
- `last_maintenance` (date, nullable)
- `next_maintenance` (date, nullable)
- `image_url` (text, nullable)
- `notes` (text, nullable)
- `qr_code` (text, nullable) — QR code payload
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 4. `asset_movements`
Audit trail for every status/location change.
- `id` (uuid, PK)
- `asset_id` (uuid, FK → assets)
- `type` (text) — 'status_change' | 'location_change' | 'maintenance' | 'note'
- `previous_value` (text, nullable)
- `new_value` (text, nullable)
- `description` (text, nullable)
- `performed_by` (text, nullable)
- `created_at` (timestamptz)

### 5. `document_categories`
Taxonomy for documents — SOPs vs Technical.
- `id` (uuid, PK)
- `name` (text)
- `type` (text) — 'sop' | 'technical'
- `created_at` (timestamptz)

### 6. `documents`
SOPs and technical documentation.
- `id` (uuid, PK)
- `title` (text)
- `slug` (text, unique)
- `category_id` (uuid, FK → document_categories)
- `content` (text) — markdown body
- `version` (integer, default 1)
- `author` (text, nullable)
- `reviewed_by` (text, nullable)
- `review_date` (date, nullable)
- `tags` (text[], nullable)
- `status` (text) — 'rascunho' | 'ativo' | 'arquivado'
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

## Security
RLS enabled on all tables with anon + authenticated read/write (no auth screen).

## Notes
This is a single-tenant operational system — no per-user ownership isolation.
*/

-- Locations
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

-- Categories
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

-- Assets
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

-- Asset Movements (audit trail)
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

-- Document Categories
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

-- Documents
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
