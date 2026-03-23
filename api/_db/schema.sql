-- MGX Medical Service Manager — Full Schema for Neon PostgreSQL
-- Conforme ISO 13485:2016 e MDR 2017/745
-- Adapted from Supabase migrations (RLS/auth/realtime removed)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLES
-- ============================================

-- Utenti (self-contained, replaces Supabase auth.users + profiles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'secretary', 'client')),
  color TEXT NOT NULL DEFAULT '#1B4F72',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dispositivi medici (anagrafica)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,
  inventory_code TEXT UNIQUE,
  category TEXT CHECK (category IN ('Diagnostica', 'Terapeutica', 'Monitoraggio', 'Laboratorio', 'Altro')),
  class_mdr TEXT CHECK (class_mdr IN ('I', 'IIa', 'IIb', 'III')),
  location TEXT,
  client TEXT,
  install_date DATE,
  warranty_end DATE,
  status TEXT DEFAULT 'operative' CHECK (status IN ('operative', 'standby', 'maintenance', 'decommissioned')),
  parent_id UUID REFERENCES devices(id),
  supplier TEXT,
  list_price NUMERIC,
  has_serial BOOLEAN DEFAULT TRUE,
  has_lot BOOLEAN DEFAULT FALSE,
  expiry_date DATE,
  software_version TEXT,
  health_score INTEGER DEFAULT 100,
  notes TEXT,
  service_hours NUMERIC DEFAULT 0,
  mtbf NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interventi (include tutti i campi estesi per digitalizzazione foglio di lavoro)
CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  code TEXT UNIQUE NOT NULL,
  device_id UUID REFERENCES devices(id),
  device_name TEXT,
  device_serial TEXT,
  intervention_type TEXT CHECK (intervention_type IN (
    'Guasto', 'Manutenzione', 'Calibrazione', 'Preventiva', 'Installazione',
    'Manutenzione Correttiva', 'Manutenzione Preventiva',
    'Verifica Sicurezza Elettrica', 'Controllo Funzionale', 'Collaudo'
  )),
  tipologia_servizio TEXT,
  structure TEXT,
  department TEXT,
  referent TEXT,
  referent_email TEXT,
  priority TEXT CHECK (priority IN ('CRITICO', 'ALTO', 'MEDIO', 'BASSO')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'in-progress', 'completed')),
  assigned_techs UUID[],
  tech_name TEXT,
  sla_minutes INTEGER DEFAULT 480,
  description TEXT,
  health_pre INTEGER,
  health_post INTEGER,
  outcome TEXT CHECK (outcome IN ('Risolto', 'Parziale', 'Escalation')),
  notes TEXT,
  parts_used JSONB DEFAULT '[]',
  -- Extended fields (paper form digitization)
  address TEXT,
  city TEXT,
  order_number TEXT,
  order_date DATE,
  request_channel TEXT CHECK (request_channel IN ('email', 'fax', 'verbale_telefonica')),
  request_reference TEXT,
  device_software_version TEXT,
  warranty_status TEXT CHECK (warranty_status IN ('garanzia', 'fuori_garanzia', 'service', 'pagamento')),
  warranty_expiry DATE,
  fault_type TEXT CHECK (fault_type IN ('Elettrico', 'Elettronico', 'Meccanico', 'Software', 'Altro')),
  work_performed TEXT,
  root_cause TEXT,
  checklist_verifiche JSONB DEFAULT '{}',
  repair_in_lab BOOLEAN DEFAULT FALSE,
  needs_transfer BOOLEAN DEFAULT FALSE,
  needs_spare_parts BOOLEAN DEFAULT FALSE,
  work_sessions JSONB DEFAULT '[]',
  completion_location TEXT,
  callout_fee NUMERIC DEFAULT 0,
  travel_fee NUMERIC DEFAULT 0,
  signatures JSONB DEFAULT '{}',
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Magazzino ricambi
CREATE TABLE IF NOT EXISTS warehouse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  qty INTEGER DEFAULT 0,
  min_qty INTEGER DEFAULT 5,
  unit_cost NUMERIC DEFAULT 0,
  supplier TEXT,
  lead_time_days INTEGER,
  location TEXT,
  compatible TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contratti
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  code TEXT UNIQUE NOT NULL,
  client TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  contract_type TEXT CHECK (contract_type IN ('Full Service', 'Time & Material', 'Preventiva Only')),
  value NUMERIC,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expiring', 'expired')),
  sla_response_hours INTEGER,
  sla_resolution_hours INTEGER,
  devices_count INTEGER,
  covered_categories TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offerte (ex Fatture/Invoices)
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  number TEXT UNIQUE,
  client TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  vat_rate NUMERIC DEFAULT 22,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until DATE,
  accepted_at TIMESTAMPTZ,
  intervention_id UUID REFERENCES interventions(id),
  description TEXT,
  notes TEXT,
  line_items JSONB DEFAULT '[]'
);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]';

-- Manutenzioni preventive schedulate
CREATE TABLE IF NOT EXISTS scheduled_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  device_id UUID REFERENCES devices(id),
  device_name TEXT,
  structure TEXT,
  tech_id UUID,
  tech_name TEXT,
  scheduled_date DATE,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in-progress', 'completed', 'overdue')),
  frequency TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eventi calendario
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  title TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('intervention', 'pm', 'standby', 'alert', 'other')),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  color TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turni reperibilita
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  tech_id UUID NOT NULL,
  tech_name TEXT NOT NULL,
  shift_type TEXT CHECK (shift_type IN ('standby', 'day')),
  shift_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifiche
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  title TEXT NOT NULL,
  message TEXT,
  notification_type TEXT CHECK (notification_type IN ('alert', 'warning', 'info', 'success')),
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  category TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strumentazione tecnici
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in-use', 'maintenance')),
  assigned_to UUID,
  calibration_due DATE,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flotta veicoli
CREATE TABLE IF NOT EXISTS fleet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  plate TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  tech_id UUID,
  tech_name TEXT,
  status TEXT DEFAULT 'parked' CHECK (status IN ('active', 'parked', 'maintenance')),
  km_today INTEGER DEFAULT 0,
  last_position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foto e documenti allegati
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  intervention_id UUID REFERENCES interventions(id),
  phase TEXT CHECK (phase IN ('PRE', 'DURANTE', 'POST', 'DOCUMENTI')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID,
  tech_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fatture
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  number TEXT UNIQUE,
  client TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  vat_rate NUMERIC DEFAULT 22,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'issued', 'paid', 'overdue')),
  issue_date TIMESTAMPTZ,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  intervention_id UUID REFERENCES interventions(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log (audit trail)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_serial ON devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_devices_client ON devices(client);
CREATE INDEX IF NOT EXISTS idx_interventions_tenant ON interventions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interventions_code ON interventions(code);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_device ON interventions(device_id);
CREATE INDEX IF NOT EXISTS idx_interventions_warranty_status ON interventions(warranty_status);
CREATE INDEX IF NOT EXISTS idx_interventions_fault_type ON interventions(fault_type);
CREATE INDEX IF NOT EXISTS idx_interventions_city ON interventions(city);
CREATE INDEX IF NOT EXISTS idx_warehouse_tenant ON warehouse(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_code ON warehouse(code);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_offers_tenant ON offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_sched_maint_tenant ON scheduled_maintenance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_tenant ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_shifts_tenant ON shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_attachments_intervention ON attachments(intervention_id);
CREATE INDEX IF NOT EXISTS idx_activity_tenant ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleet_tenant ON fleet(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
