-- =============================================================================
-- Migration 002: Extend interventions table for full paper form digitization
-- Digitalizzazione completa del foglio di lavoro cartaceo Mi.Co.Medical
-- =============================================================================

-- --- Sezione 1: Indirizzo Cliente ---
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS city TEXT;

-- --- Sezione 2: Ordine e Richiesta Intervento ---
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS order_date DATE;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS request_channel TEXT
  CHECK (request_channel IN ('email', 'fax', 'verbale_telefonica'));
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS request_reference TEXT;

-- --- Sezione 3: Estensione Tipologie Intervento ---
ALTER TABLE interventions DROP CONSTRAINT IF EXISTS interventions_intervention_type_check;
ALTER TABLE interventions ADD CONSTRAINT interventions_intervention_type_check
  CHECK (intervention_type IN (
    'Guasto', 'Manutenzione', 'Calibrazione', 'Preventiva', 'Installazione',
    'Manutenzione Correttiva', 'Manutenzione Preventiva',
    'Verifica Sicurezza Elettrica', 'Controllo Funzionale', 'Collaudo'
  ));

-- --- Sezione 4: Versione Software Dispositivo ---
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS device_software_version TEXT;

-- --- Sezione 5: Stato Garanzia / Pagamento ---
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS warranty_status TEXT
  CHECK (warranty_status IN ('garanzia', 'fuori_garanzia', 'service', 'pagamento'));
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS warranty_expiry DATE;

-- --- Sezione 6: Tipo Guasto, Lavoro Eseguito, Causa ---
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS fault_type TEXT
  CHECK (fault_type IN ('Elettrico', 'Elettronico', 'Meccanico', 'Software', 'Altro'));
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS work_performed TEXT;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS root_cause TEXT;

-- --- Sezione 7: Checklist Controlli e Verifiche (20 voci) ---
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS checklist_verifiche JSONB DEFAULT '{}';

-- --- Sezione 8: Stato Riparazione ---
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS repair_in_lab BOOLEAN DEFAULT FALSE;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS needs_transfer BOOLEAN DEFAULT FALSE;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS needs_spare_parts BOOLEAN DEFAULT FALSE;

-- --- Sezione 9: Ricambi - S/N gestito a livello applicativo nel JSONB parts_used ---

-- --- Sezione 10: Sessioni di Lavoro (max 3) ---
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS work_sessions JSONB DEFAULT '[]';
-- Formato: [{ "date": "2025-01-15", "techName": "Marco Rossi", "workHours": 4.5, "travelHours": 1.0 }]

-- --- Sezione 11: Dati Completamento ---
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS completion_location TEXT;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS callout_fee NUMERIC DEFAULT 0;
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS travel_fee NUMERIC DEFAULT 0;

-- --- Sezione 12: Firme (3 blocchi) ---
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS signatures JSONB DEFAULT '{}';
-- Formato: {
--   "execution":    { "role": "Tecnico", "name": "Marco Rossi", "dataUrl": "data:image/png;base64,...", "signedAt": "ISO8601" },
--   "confirmation": { "role": "Responsabile", "name": "...", "dataUrl": "...", "signedAt": "..." },
--   "verification": { "role": "Verificatore", "name": "...", "dataUrl": "...", "signedAt": "..." }
-- }

-- --- Indici per campi interrogabili ---
CREATE INDEX IF NOT EXISTS idx_interventions_warranty_status ON interventions(warranty_status);
CREATE INDEX IF NOT EXISTS idx_interventions_fault_type ON interventions(fault_type);
CREATE INDEX IF NOT EXISTS idx_interventions_city ON interventions(city);
