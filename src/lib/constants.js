// ─── Roles ───────────────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN: 'admin',
  TECHNICIAN: 'technician',
  SECRETARY: 'secretary',
  CLIENT: 'client',
}

export const ROLE_LABELS = {
  admin: 'Amministratore',
  technician: 'Tecnico',
  secretary: 'Segreteria',
  client: 'Cliente',
}

export const ROLE_ICONS = {
  admin: '\u{1F451}',
  technician: '\u{1F527}',
  secretary: '\u{1F4CB}',
  client: '\u{1F3E5}',
}

// ─── Color Palette ───────────────────────────────────────────────────────────

export const COLORS = {
  primaryBlue: '#1B4F72',
  accentBlue: '#2E86C1',
  lightBlue: '#D6EAF8',
  darkGray: '#2C3E50',
  lightGray: '#F2F4F4',
  success: '#27AE60',
  warning: '#E67E22',
  danger: '#C0392B',
  critical: '#922B21',
  info: '#3498DB',
}

// ─── Priority Configuration ──────────────────────────────────────────────────

export const PRIORITY_CONFIG = {
  CRITICO: {
    color: '#C0392B',
    bg: '#FADBD8',
    label: 'CRITICO',
  },
  ALTO: {
    color: '#E67E22',
    bg: '#FDEBD0',
    label: 'ALTO',
  },
  MEDIO: {
    color: '#F1C40F',
    bg: '#FEF9E7',
    label: 'MEDIO',
  },
  BASSO: {
    color: '#27AE60',
    bg: '#D5F5E3',
    label: 'BASSO',
  },
}

// ─── Status Configuration ────────────────────────────────────────────────────

export const STATUS_CONFIG = {
  completed: {
    color: '#27AE60',
    bg: '#D5F5E3',
    label: 'Completato',
  },
  'in-progress': {
    color: '#2E86C1',
    bg: '#D6EAF8',
    label: 'In corso',
  },
  pending: {
    color: '#E67E22',
    bg: '#FDEBD0',
    label: 'In attesa',
  },
  acknowledged: {
    color: '#8E44AD',
    bg: '#E8DAEF',
    label: 'Preso in carico',
  },
}

// ─── Intervention & Device Enumerations ──────────────────────────────────────

export const INTERVENTION_TYPES = [
  'Guasto',
  'Manutenzione',
  'Calibrazione',
  'Preventiva',
  'Installazione',
  'Manutenzione Correttiva',
  'Manutenzione Preventiva',
  'Verifica Sicurezza Elettrica',
  'Controllo Funzionale',
  'Collaudo',
]

// ─── Tipologia Servizio (foglio di lavoro cartaceo) ─────────────────────────

export const TIPOLOGIA_SERVIZIO = [
  'Manutenzione Correttiva',
  'Manutenzione Preventiva',
  'Verifica Sicurezza Elettrica',
  'Controllo Funzionale',
  'Collaudo',
]

// ─── Canale Richiesta Intervento ────────────────────────────────────────────

export const REQUEST_CHANNELS = [
  { value: 'email', label: 'Posta Elettronica' },
  { value: 'fax', label: 'Fax' },
  { value: 'verbale_telefonica', label: 'Verbale / Telefonica' },
]

// ─── Stato Garanzia / Pagamento ─────────────────────────────────────────────

export const WARRANTY_STATUS_OPTIONS = [
  { value: 'garanzia', label: 'Garanzia' },
  { value: 'fuori_garanzia', label: 'Fuori Garanzia' },
  { value: 'service', label: 'Service' },
  { value: 'pagamento', label: 'Pagamento' },
]

// ─── Tipo di Guasto ─────────────────────────────────────────────────────────

export const FAULT_TYPES = [
  'Elettrico',
  'Elettronico',
  'Meccanico',
  'Software',
  'Altro',
]

// ─── Checklist Controlli e Verifiche (20 voci) ──────────────────────────────

export const CHECKLIST_ITEMS = [
  { key: 'tensione_cavo_alimentazione', label: 'Tensione / Cavo Alimentazione' },
  { key: 'parti_danneggiate_deformate', label: 'Parti Danneggiate / Deformate' },
  { key: 'cavetteria_connettori', label: 'Cavetteria e Connettori' },
  { key: 'sonde_elettrodi_sensori', label: 'Sonde / Elettrodi / Sensori' },
  { key: 'temperatura_apparecchiatura', label: 'Temperatura Apparecchiatura' },
  { key: 'pulizia_esterna_interna', label: 'Pulizia Esterna / Interna' },
  { key: 'terra_protezione', label: 'Terra di Protezione' },
  { key: 'sistema_ottico', label: 'Sistema Ottico' },
  { key: 'sistema_meccanico', label: 'Sistema Meccanico' },
  { key: 'circuito_idraulico', label: 'Circuito Idraulico' },
  { key: 'indicatore_spie_luminose', label: 'Indicatore e Spie Luminose' },
  { key: 'tarature_calibrazioni', label: 'Tarature / Calibrazioni' },
  { key: 'filtri', label: 'Filtri' },
  { key: 'acquisizione_riproduzione_stampa', label: 'Acquisizione / Riproduzione / Stampa' },
  { key: 'hardware', label: 'Hardware' },
  { key: 'connettivita', label: 'Connettività (Cablata / Wireless)' },
  { key: 'software', label: 'Software' },
  { key: 'database_backup', label: 'Database / Backup Dati' },
  { key: 'comandi_operatore', label: 'Op. Comandi Acc. Operatore' },
  { key: 'prove_funzionamento', label: 'Prove di Funzionamento' },
]

// ─── Warranty Levels ─────────────────────────────────────────────────────────

export const WARRANTY_LEVELS = {
  EXPIRED: {
    color: '#C0392B',
    bg: '#FADBD8',
    label: 'SCADUTA',
    condition: (daysLeft) => daysLeft < 0,
  },
  CRITICAL: {
    color: '#E67E22',
    bg: '#FDEBD0',
    label: 'CRITICA',
    condition: (daysLeft) => daysLeft <= 30,
  },
  WARNING: {
    color: '#F1C40F',
    bg: '#FEF9E7',
    label: 'WARNING',
    condition: (daysLeft) => daysLeft <= 90,
  },
  OK: {
    color: '#27AE60',
    bg: '#D5F5E3',
    label: 'VALIDA',
    condition: (daysLeft) => daysLeft > 90,
  },
}

// ─── Navigation Items ────────────────────────────────────────────────────────

const ALL_ROLES = [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.SECRETARY, ROLES.CLIENT]

export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    roles: ALL_ROLES,
  },
  {
    id: 'interventions',
    label: 'Interventi',
    icon: 'Wrench',
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.SECRETARY],
  },
  {
    id: 'registry',
    label: 'Anagrafica',
    icon: 'Database',
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN],
  },
  {
    id: 'warranties',
    label: 'Garanzie',
    icon: 'Shield',
    roles: [ROLES.ADMIN, ROLES.SECRETARY],
  },
  {
    id: 'dhr',
    label: 'Dispositivi DHR',
    icon: 'FileText',
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN],
  },
  {
    id: 'equipment',
    label: 'Strumentazione',
    icon: 'Microscope',
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN],
  },
  {
    id: 'fleet',
    label: 'Flotta',
    icon: 'Truck',
    roles: [ROLES.ADMIN],
  },
  {
    id: 'calendar',
    label: 'Calendario',
    icon: 'Calendar',
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.SECRETARY],
  },
  {
    id: 'warehouse',
    label: 'Magazzino',
    icon: 'Package',
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN],
  },
  {
    id: 'contracts',
    label: 'Contratti',
    icon: 'FileSignature',
    roles: [ROLES.ADMIN, ROLES.SECRETARY],
  },
  {
    id: 'reports',
    label: 'Report',
    icon: 'BarChart3',
    roles: [ROLES.ADMIN, ROLES.SECRETARY],
  },
  {
    id: 'maintenance',
    label: 'Manutenzione PM',
    icon: 'Settings',
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN],
  },
  {
    id: 'offers',
    label: 'Offerte',
    icon: 'FileText',
    roles: [ROLES.ADMIN, ROLES.SECRETARY],
  },
  {
    id: 'portal',
    label: 'Portale Cliente',
    icon: 'Building2',
    roles: [ROLES.ADMIN, ROLES.SECRETARY],
  },
  {
    id: 'standby',
    label: 'Reperibilit\u00E0',
    icon: 'Moon',
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN],
  },
  {
    id: 'photos',
    label: 'Foto & Docs',
    icon: 'Camera',
    roles: [ROLES.ADMIN, ROLES.TECHNICIAN],
  },
  {
    id: 'notifications',
    label: 'Notifiche',
    icon: 'Bell',
    roles: ALL_ROLES,
  },
  {
    id: 'mlengine',
    label: 'ML Engine',
    icon: 'Brain',
    roles: [ROLES.ADMIN],
  },
  {
    id: 'cloud',
    label: 'Cloud & Sync',
    icon: 'Cloud',
    roles: [ROLES.ADMIN],
  },
]
