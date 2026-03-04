-- MGX Medical Service Manager — Initial Schema
-- Conforme ISO 13485:2016 e MDR 2017/745

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profili utente (estende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'technician', 'secretary', 'client')),
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dispositivi medici (anagrafica)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,
  inventory_code TEXT,
  category TEXT CHECK (category IN ('Diagnostica', 'Terapeutica', 'Monitoraggio', 'Laboratorio', 'Altro')),
  class_mdr TEXT CHECK (class_mdr IN ('I', 'IIa', 'IIb', 'III')),
  location TEXT,
  client TEXT,
  install_date DATE,
  warranty_end DATE,
  status TEXT DEFAULT 'operative' CHECK (status IN ('operative', 'standby', 'maintenance', 'decommissioned')),
  parent_id UUID REFERENCES devices(id),
  health_score INTEGER DEFAULT 100,
  notes TEXT,
  service_hours NUMERIC DEFAULT 0,
  mtbf NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interventi
CREATE TABLE IF NOT EXISTS interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  code TEXT UNIQUE NOT NULL,
  device_id UUID REFERENCES devices(id),
  device_name TEXT,
  device_serial TEXT,
  intervention_type TEXT CHECK (intervention_type IN ('Guasto', 'Manutenzione', 'Calibrazione', 'Preventiva', 'Installazione')),
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Magazzino ricambi
CREATE TABLE IF NOT EXISTS warehouse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
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
  tenant_id UUID NOT NULL,
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

-- Fatture
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  number TEXT,
  client TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  vat_rate NUMERIC DEFAULT 22,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'issued', 'paid', 'overdue')),
  issue_date DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  intervention_id UUID REFERENCES interventions(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manutenzioni preventive schedulate
CREATE TABLE IF NOT EXISTS scheduled_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
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
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('intervention', 'pm', 'standby', 'alert', 'other')),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  color TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turni reperibilità
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
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
  tenant_id UUID NOT NULL,
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
  tenant_id UUID NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in-use', 'maintenance')),
  assigned_to UUID,
  calibration_due DATE,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foto e documenti allegati
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  intervention_id UUID REFERENCES interventions(id),
  phase TEXT CHECK (phase IN ('PRE', 'DURANTE', 'POST', 'DOCUMENTI')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID,
  tech_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log (audit trail)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_serial ON devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_devices_client ON devices(client);
CREATE INDEX IF NOT EXISTS idx_interventions_tenant ON interventions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_interventions_code ON interventions(code);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_device ON interventions(device_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_tenant ON warehouse(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_code ON warehouse(code);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_sched_maint_tenant ON scheduled_maintenance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_tenant ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_shifts_tenant ON shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_attachments_intervention ON attachments(intervention_id);
CREATE INDEX IF NOT EXISTS idx_activity_tenant ON activity_log(tenant_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- For tenant-based tables, create policies that allow access within the same tenant
-- The tenant_id would be extracted from the user's JWT claims or profile

-- Devices policies
CREATE POLICY "Tenant read devices" ON devices
  FOR SELECT USING (true); -- Simplified for demo; in production use tenant_id check

CREATE POLICY "Tenant insert devices" ON devices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tenant update devices" ON devices
  FOR UPDATE USING (true);

-- Interventions policies
CREATE POLICY "Tenant read interventions" ON interventions
  FOR SELECT USING (true);

CREATE POLICY "Tenant insert interventions" ON interventions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tenant update interventions" ON interventions
  FOR UPDATE USING (true);

-- Warehouse policies
CREATE POLICY "Tenant read warehouse" ON warehouse
  FOR SELECT USING (true);

CREATE POLICY "Tenant insert warehouse" ON warehouse
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tenant update warehouse" ON warehouse
  FOR UPDATE USING (true);

-- Contracts policies
CREATE POLICY "Tenant read contracts" ON contracts
  FOR SELECT USING (true);

CREATE POLICY "Tenant insert contracts" ON contracts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tenant update contracts" ON contracts
  FOR UPDATE USING (true);

-- Invoices policies
CREATE POLICY "Tenant read invoices" ON invoices
  FOR SELECT USING (true);

CREATE POLICY "Tenant insert invoices" ON invoices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tenant update invoices" ON invoices
  FOR UPDATE USING (true);

-- Scheduled maintenance policies
CREATE POLICY "Tenant read sched_maint" ON scheduled_maintenance
  FOR SELECT USING (true);

CREATE POLICY "Tenant insert sched_maint" ON scheduled_maintenance
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tenant update sched_maint" ON scheduled_maintenance
  FOR UPDATE USING (true);

-- Calendar events policies
CREATE POLICY "Tenant read cal_events" ON calendar_events
  FOR SELECT USING (true);

CREATE POLICY "Tenant insert cal_events" ON calendar_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tenant update cal_events" ON calendar_events
  FOR UPDATE USING (true);

CREATE POLICY "Tenant delete cal_events" ON calendar_events
  FOR DELETE USING (true);

-- Shifts policies
CREATE POLICY "Tenant read shifts" ON shifts
  FOR SELECT USING (true);

CREATE POLICY "Tenant insert shifts" ON shifts
  FOR INSERT WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Tenant read notifications" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "Tenant insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Tenant update notifications" ON notifications
  FOR UPDATE USING (true);

CREATE POLICY "Tenant delete notifications" ON notifications
  FOR DELETE USING (true);

-- Equipment policies
CREATE POLICY "Tenant read equipment" ON equipment
  FOR SELECT USING (true);

CREATE POLICY "Tenant update equipment" ON equipment
  FOR UPDATE USING (true);

-- Attachments policies
CREATE POLICY "Tenant read attachments" ON attachments
  FOR SELECT USING (true);

CREATE POLICY "Tenant insert attachments" ON attachments
  FOR INSERT WITH CHECK (true);

-- Activity log policies
CREATE POLICY "Tenant read activity" ON activity_log
  FOR SELECT USING (true);

CREATE POLICY "Tenant insert activity" ON activity_log
  FOR INSERT WITH CHECK (true);

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for key tables

ALTER PUBLICATION supabase_realtime ADD TABLE devices;
ALTER PUBLICATION supabase_realtime ADD TABLE interventions;
ALTER PUBLICATION supabase_realtime ADD TABLE warehouse;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE scheduled_maintenance;
