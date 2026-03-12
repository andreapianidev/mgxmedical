# MGX Medical Service Manager (MSM)

**Piattaforma gestionale per il ciclo di vita dei dispositivi medici e assistenza tecnica**

Conforme a **ISO 13485:2016** e **MDR 2017/745**

---

## Panoramica

MGX Medical Service Manager e una Single Page Application (SPA) progettata per gestire l'intero ciclo di vita dei dispositivi medici: dall'installazione alla dismissione, passando per interventi tecnici, manutenzioni preventive, garanzie, contratti di assistenza e fatturazione.

Il sistema integra un motore di Machine Learning predittivo per la manutenzione proattiva e un portale dedicato ai clienti per la consultazione in tempo reale dello stato dei propri dispositivi.

---

## Funzionalita Principali

| Modulo | Descrizione |
|---|---|
| **Dashboard** | Ricerca per S/N, 7 KPI operativi, bacheca richieste live, widget garanzie |
| **Interventi** | Gestione completa con wizard 4 step, chiusura con ricambi, condivisione via email/WhatsApp |
| **Anagrafica Dispositivi** | Registro master con vista tabella/albero, CRUD completo, gerarchia parent/child |
| **DHR (Device History Record)** | Storico completo per dispositivo, grafici salute, predizioni ML, compliance |
| **Garanzie & Rinnovi** | Alert multilivello (scaduta/critica/warning/valida), notifiche batch |
| **Strumentazione** | Gestione attrezzature tecniche, calibrazioni, assegnazione a tecnici |
| **Flotta & Tecnici** | Monitoraggio veicoli, navigazione Google Maps/Waze, stato tecnici |
| **Calendario** | Vista mensile, eventi per tipo con codifica colore, CRUD eventi |
| **Magazzino Ricambi** | Gestione scorte, rettifiche con audit trail, scalatura automatica |
| **Contratti** | Gestione SLA, tipologie (Full Service/T&M/Preventiva), alert rinnovo |
| **Report & Analytics** | KPI, grafici Recharts, ranking tecnici, export CSV |
| **Manutenzione Preventiva** | Pianificazione PM per classe MDR, auto-scaduto, completamento |
| **Fatturazione** | Workflow fatture (bozza > inviata > emessa > pagata), auto-scaduto |
| **Portale Cliente** | Vista dedicata per cliente, SLA report, documenti, link portale |
| **Reperibilita** | Turni settimanali, tecnico in servizio oggi, statistiche |
| **Foto & Documentazione** | Allegati per fase (PRE/DURANTE/POST/DOCUMENTI), lightbox |
| **Centro Notifiche** | Filtri per tipo/categoria, pin, segna letto, eliminazione |
| **ML Engine** | 4 modelli predittivi, predizioni per dispositivo, grafici forecast |
| **Cloud & Sync** | Stato connessione live, utenti online, log attivita, compliance |

---

## Profili Utente

| Ruolo | Accesso |
|---|---|
| **Admin** | Accesso completo a tutti i moduli |
| **Tecnico** | Dashboard, Interventi, DHR, Calendario, Magazzino, Manutenzione, Foto, Notifiche |
| **Segreteria** | Dashboard, Interventi, Anagrafica, Garanzie, Contratti, Fatturazione, Report, Calendario, Notifiche |
| **Cliente** | Dashboard, Portale Cliente, Notifiche |

---

## Stack Tecnologico

- **Frontend:** React 18 + Hooks
- **Routing:** React Router v6
- **Styling:** Tailwind CSS v4
- **Bundler:** Vite 7
- **Icone:** Lucide React
- **Grafici:** Recharts
- **Date:** date-fns (locale italiano)
- **Backend (da configurare):** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Deploy:** Vercel

---

## Installazione

### Prerequisiti

- Node.js >= 20.19
- npm o yarn

### Setup

```bash
# Clona il repository
git clone https://github.com/andreapianidev/mgxmedical.git
cd mgxmedical

# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev
```

L'applicazione sara disponibile su `http://localhost:5173`

### Build di produzione

```bash
npm run build
npm run preview
```

---

## Configurazione Supabase

> La configurazione Supabase e prevista in una fase successiva.

1. Creare un progetto su [supabase.com](https://supabase.com)
2. Eseguire le migrazioni SQL presenti in `supabase/migrations/001_initial_schema.sql`
3. Configurare le variabili d'ambiente nel file `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Creare gli utenti demo in Supabase Auth
5. Abilitare Row Level Security (RLS) sulle tabelle

---

## Dati Demo

L'applicazione include un set completo di dati dimostrativi precaricati:

- **4 utenti** con accesso rapido dalla schermata di login
- **12 dispositivi medici** distribuiti su 5 strutture ospedaliere
- **8 interventi** in vari stati (pending, acknowledged, in-progress, completed)
- **10 articoli** di magazzino ricambi
- **5 contratti** di assistenza
- **6 fatture** nel ciclo di fatturazione
- **6 manutenzioni** preventive pianificate
- **10 eventi** calendario
- **10 notifiche** di sistema
- **Predizioni ML** per tutti i dispositivi

### Login rapido

Dalla schermata di login, utilizzare i pulsanti di accesso rapido:

| Utente | Ruolo | Email |
|---|---|---|
| Marco Rossi | Admin | marco.rossi@mgx-medical.it |
| Luca Bianchi | Tecnico | luca.bianchi@mgx-medical.it |
| Sara Verdi | Segreteria | sara.verdi@mgx-medical.it |
| Giovanni Neri | Cliente | giovanni.neri@ospedale-milano.it |

---

## Struttura del Progetto

```
mgxmedical/
├── public/
├── src/
│   ├── components/
│   │   ├── layout/          # AppShell, Sidebar, Topbar
│   │   ├── modules/         # 19 moduli funzionali
│   │   ├── shared/          # Componenti riutilizzabili (KpiCard, Modal, StatusChip, etc.)
│   │   └── LoginScreen.jsx
│   ├── contexts/            # AuthContext, ToastContext, GlobalStoreContext
│   ├── data/                # Dati demo (demoData.js)
│   ├── hooks/               # Custom hooks (useStore, useOnlineUsers, useElapsed, useActivityLog)
│   ├── lib/                 # Utilities, costanti, client Supabase
│   ├── styles/              # CSS globale e animazioni
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   └── migrations/          # Schema SQL per Supabase
├── vercel.json              # Configurazione deploy Vercel
└── package.json
```

---

## Deploy su Vercel

Il progetto e pre-configurato per il deploy su Vercel:

1. Collegare il repository GitHub a Vercel
2. Configurare le variabili d'ambiente (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
3. Il file `vercel.json` gestisce automaticamente il routing SPA

---

## Compliance e Standard

- **ISO 13485:2016** -- Sistema di gestione della qualita per dispositivi medici
- **MDR 2017/745** -- Regolamento europeo sui dispositivi medici
- **Classificazione MDR** -- Supporto classi I, IIa, IIb, III
- **DHR** -- Device History Record per tracciabilita completa
- **Audit Trail** -- Log delle attivita per conformita normativa

---

## Licenza

Progetto proprietario. Tutti i diritti riservati.

&copy; 2025 MGX Medical
