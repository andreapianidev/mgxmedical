import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import { methodNotAllowed } from './_lib/errors.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  // Simple protection: require a seed key
  const { key } = req.body || {};
  if (key !== process.env.SEED_KEY && key !== 'mgx-seed-2026') {
    return res.status(403).json({ error: 'Chiave seed non valida' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // --- 1. Seed Users ---
    const users = [
      { email: 'a.ferretti@mgxmedical.com', password: 'admin123', name: 'Alessandro Ferretti', avatar: 'AF', role: 'admin', color: '#1B4F72' },
      { email: 'm.rossi@mgxmedical.com', password: 'tecnico123', name: 'Marco Rossi', avatar: 'MR', role: 'technician', color: '#148F77' },
      { email: 's.colombo@mgxmedical.com', password: 'segr123', name: 'Sara Colombo', avatar: 'SC', role: 'secretary', color: '#8E44AD' },
      { email: 'demo@cliente.it', password: 'cliente123', name: 'Demo Cliente', avatar: 'DC', role: 'client', color: '#E67E22' },
    ];

    const userIds = {};
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      const rows = await sql`
        INSERT INTO users (tenant_id, email, password_hash, name, avatar, role, color)
        VALUES (${TENANT_ID}, ${u.email}, ${hash}, ${u.name}, ${u.avatar}, ${u.role}, ${u.color})
        ON CONFLICT (email) DO UPDATE SET password_hash = ${hash}, name = ${u.name}, avatar = ${u.avatar}, role = ${u.role}, color = ${u.color}
        RETURNING id
      `;
      userIds[u.role] = rows[0].id;
    }

    // --- 2. Seed Devices ---
    const devices = [
      { name: 'Ventilatore Polmonare', brand: 'Maquet', model: 'SERVO-U', serialNumber: 'SV2024-001', inventoryCode: 'INV-VP-001', category: 'Terapeutica', classMdr: 'IIb', location: 'Reparto Terapia Intensiva - Piano 2', client: 'Osp. San Raffaele', installDate: '2024-03-15', warrantyEnd: '2026-03-15', status: 'operative', healthScore: 92, serviceHours: 4820, mtbf: 2200 },
      { name: 'Monitor Multiparametrico', brand: 'Philips', model: 'IntelliVue MX800', serialNumber: 'MX2024-002', inventoryCode: 'INV-MM-002', category: 'Monitoraggio', classMdr: 'IIa', location: 'Reparto Cardiologia - Piano 3', client: 'Osp. San Raffaele', installDate: '2024-01-10', warrantyEnd: '2026-01-10', status: 'operative', healthScore: 88, serviceHours: 6200, mtbf: 3100 },
      { name: 'Ecografo Portatile', brand: 'GE Healthcare', model: 'Venue Go', serialNumber: 'VG2024-003', inventoryCode: 'INV-EP-003', category: 'Diagnostica', classMdr: 'IIa', location: 'Ambulatorio Ecografia - Piano 1', client: 'Osp. Niguarda', installDate: '2024-06-01', warrantyEnd: '2026-06-01', status: 'operative', healthScore: 95, serviceHours: 1800, mtbf: 4000 },
      { name: 'Defibrillatore', brand: 'Zoll', model: 'R-Series Plus', serialNumber: 'ZR2024-004', inventoryCode: 'INV-DF-004', category: 'Terapeutica', classMdr: 'III', location: 'Pronto Soccorso', client: 'Osp. Niguarda', installDate: '2023-11-20', warrantyEnd: '2025-11-20', status: 'operative', healthScore: 78, serviceHours: 3400, mtbf: 1800 },
      { name: 'Pompa Infusione', brand: 'B. Braun', model: 'Infusomat Space', serialNumber: 'IS2024-005', inventoryCode: 'INV-PI-005', category: 'Terapeutica', classMdr: 'IIb', location: 'Reparto Oncologia - Piano 4', client: 'Osp. San Raffaele', installDate: '2024-02-28', warrantyEnd: '2026-02-28', status: 'maintenance', healthScore: 45, serviceHours: 5600, mtbf: 1500 },
      { name: 'Elettrocardiografo', brand: 'GE Healthcare', model: 'MAC 2000', serialNumber: 'MC2024-006', inventoryCode: 'INV-EC-006', category: 'Diagnostica', classMdr: 'IIa', location: 'Ambulatorio Cardiologia', client: 'Clinica Humanitas', installDate: '2024-04-15', warrantyEnd: '2026-04-15', status: 'operative', healthScore: 91, serviceHours: 2100, mtbf: 3500 },
      { name: 'Centrifuga da Laboratorio', brand: 'Eppendorf', model: '5804 R', serialNumber: 'EP2024-007', inventoryCode: 'INV-CL-007', category: 'Laboratorio', classMdr: 'I', location: 'Laboratorio Analisi - Piano 0', client: 'Osp. San Raffaele', installDate: '2024-05-10', warrantyEnd: '2026-05-10', status: 'operative', healthScore: 97, serviceHours: 1200, mtbf: 5000 },
      { name: 'Autoclave', brand: 'Tuttnauer', model: '3870EA', serialNumber: 'TT2024-008', inventoryCode: 'INV-AC-008', category: 'Altro', classMdr: 'IIa', location: 'Centrale Sterilizzazione', client: 'Osp. Niguarda', installDate: '2023-09-01', warrantyEnd: '2025-09-01', status: 'operative', healthScore: 82, serviceHours: 7800, mtbf: 2000 },
      { name: 'Microscopio Chirurgico', brand: 'Zeiss', model: 'KINEVO 900', serialNumber: 'ZK2024-009', inventoryCode: 'INV-MC-009', category: 'Diagnostica', classMdr: 'I', location: 'Sala Operatoria 3 - Piano 2', client: 'Clinica Humanitas', installDate: '2024-07-01', warrantyEnd: '2026-07-01', status: 'standby', healthScore: 99, serviceHours: 400, mtbf: 8000 },
      { name: 'Tavolo Operatorio', brand: 'Maquet', model: 'Magnus', serialNumber: 'MG2024-010', inventoryCode: 'INV-TO-010', category: 'Altro', classMdr: 'I', location: 'Sala Operatoria 1 - Piano 2', client: 'Osp. San Raffaele', installDate: '2023-06-15', warrantyEnd: '2025-06-15', status: 'operative', healthScore: 86, serviceHours: 5200, mtbf: 3000 },
    ];

    const deviceIds = {};
    for (const d of devices) {
      const rows = await sql`
        INSERT INTO devices (tenant_id, name, brand, model, serial_number, inventory_code, category, class_mdr, location, client, install_date, warranty_end, status, health_score, service_hours, mtbf)
        VALUES (${TENANT_ID}, ${d.name}, ${d.brand}, ${d.model}, ${d.serialNumber}, ${d.inventoryCode}, ${d.category}, ${d.classMdr}, ${d.location}, ${d.client}, ${d.installDate}, ${d.warrantyEnd}, ${d.status}, ${d.healthScore}, ${d.serviceHours}, ${d.mtbf})
        ON CONFLICT (serial_number) DO NOTHING
        RETURNING id, serial_number
      `;
      if (rows.length > 0) deviceIds[d.serialNumber] = rows[0].id;
    }

    // --- 3. Seed Interventions ---
    const interventions = [
      { code: 'INT-2401', deviceName: 'Ventilatore Polmonare Maquet SERVO-U', deviceSerial: 'SV2024-001', interventionType: 'Guasto', structure: 'Osp. San Raffaele', department: 'Terapia Intensiva', referent: 'Dr. Lucia Bianchi', priority: 'CRITICO', status: 'completed', techName: 'Marco Rossi', slaMinutes: 120, description: 'Sensore pressione prossimale non funzionante', healthPre: 62, healthPost: 94, outcome: 'Risolto', address: 'Via Olgettina, 60', city: 'Milano', warrantyStatus: 'garanzia', faultType: 'Elettronico' },
      { code: 'INT-2402', deviceName: 'Monitor Multiparametrico Philips IntelliVue MX800', deviceSerial: 'MX2024-002', interventionType: 'Calibrazione', structure: 'Osp. San Raffaele', department: 'Cardiologia', referent: 'Dr. Marco Verdi', priority: 'MEDIO', status: 'in-progress', techName: 'Marco Rossi', slaMinutes: 480, description: 'Calibrazione sensori SpO2 e NIBP', healthPre: 88, address: 'Via Olgettina, 60', city: 'Milano', warrantyStatus: 'garanzia' },
      { code: 'INT-2403', deviceName: 'Defibrillatore Zoll R-Series Plus', deviceSerial: 'ZR2024-004', interventionType: 'Manutenzione Correttiva', structure: 'Osp. Niguarda', department: 'Pronto Soccorso', referent: 'Dr. Anna Russo', priority: 'ALTO', status: 'pending', techName: 'Marco Rossi', slaMinutes: 240, description: 'Sostituzione batteria e test scarica', healthPre: 78, address: 'Piazza Ospedale Maggiore, 3', city: 'Milano', warrantyStatus: 'fuori_garanzia', faultType: 'Elettrico' },
      { code: 'INT-2404', deviceName: 'Pompa Infusione B. Braun Infusomat Space', deviceSerial: 'IS2024-005', interventionType: 'Guasto', structure: 'Osp. San Raffaele', department: 'Oncologia', referent: 'Dr. Paolo Colombo', priority: 'ALTO', status: 'completed', techName: 'Marco Rossi', slaMinutes: 240, description: 'Errore occlusione persistente, necessaria revisione meccanismo peristaltico', healthPre: 45, healthPost: 87, outcome: 'Risolto', address: 'Via Olgettina, 60', city: 'Milano', warrantyStatus: 'service', faultType: 'Meccanico' },
      { code: 'INT-2405', deviceName: 'Ecografo Portatile GE Venue Go', deviceSerial: 'VG2024-003', interventionType: 'Preventiva', structure: 'Osp. Niguarda', department: 'Ecografia', referent: 'Dr. Giulia Ferri', priority: 'BASSO', status: 'acknowledged', techName: 'Marco Rossi', slaMinutes: 960, description: 'Manutenzione preventiva annuale', healthPre: 95, address: 'Piazza Ospedale Maggiore, 3', city: 'Milano', warrantyStatus: 'garanzia' },
    ];

    for (const intv of interventions) {
      const deviceId = deviceIds[intv.deviceSerial] || null;
      await sql`
        INSERT INTO interventions (
          tenant_id, code, device_id, device_name, device_serial,
          intervention_type, structure, department, referent, priority, status,
          tech_name, sla_minutes, description, health_pre, health_post, outcome,
          address, city, warranty_status, fault_type
        ) VALUES (
          ${TENANT_ID}, ${intv.code}, ${deviceId}, ${intv.deviceName}, ${intv.deviceSerial},
          ${intv.interventionType}, ${intv.structure}, ${intv.department}, ${intv.referent},
          ${intv.priority}, ${intv.status}, ${intv.techName}, ${intv.slaMinutes},
          ${intv.description}, ${intv.healthPre}, ${intv.healthPost || null}, ${intv.outcome || null},
          ${intv.address || null}, ${intv.city || null}, ${intv.warrantyStatus || null}, ${intv.faultType || null}
        ) ON CONFLICT (code) DO NOTHING
      `;
    }

    // --- 4. Seed Warehouse ---
    const warehouseItems = [
      { code: 'SP-SRV-001', name: 'Sensore pressione prossimale SERVO-U', category: 'Sensori', qty: 5, minQty: 3, unitCost: 320, supplier: 'Maquet Medical', leadTimeDays: 7, location: 'Rack A-23' },
      { code: 'SP-MX-001', name: 'Modulo SpO2 IntelliVue', category: 'Moduli', qty: 2, minQty: 2, unitCost: 890, supplier: 'Philips Medical', leadTimeDays: 14, location: 'Rack B-11' },
      { code: 'SP-ZR-001', name: 'Batteria Zoll R-Series', category: 'Batterie', qty: 8, minQty: 4, unitCost: 245, supplier: 'Zoll Medical', leadTimeDays: 5, location: 'Rack C-05' },
      { code: 'SP-BB-001', name: 'Kit peristaltico Infusomat', category: 'Kit', qty: 12, minQty: 6, unitCost: 156, supplier: 'B. Braun', leadTimeDays: 10, location: 'Rack A-15' },
      { code: 'SP-GE-001', name: 'Sonda lineare Venue Go', category: 'Sonde', qty: 1, minQty: 1, unitCost: 2800, supplier: 'GE Healthcare', leadTimeDays: 21, location: 'Rack D-01' },
      { code: 'SP-GEN-001', name: 'Cavo ECG universale 5 derivazioni', category: 'Cavi', qty: 20, minQty: 10, unitCost: 45, supplier: 'MedParts Italia', leadTimeDays: 3, location: 'Rack A-01' },
      { code: 'SP-GEN-002', name: 'Sensore SpO2 adulto clip', category: 'Sensori', qty: 15, minQty: 8, unitCost: 35, supplier: 'MedParts Italia', leadTimeDays: 3, location: 'Rack A-02' },
      { code: 'SP-GEN-003', name: 'Bracciale NIBP adulto standard', category: 'Accessori', qty: 10, minQty: 5, unitCost: 28, supplier: 'MedParts Italia', leadTimeDays: 3, location: 'Rack A-03' },
    ];

    for (const w of warehouseItems) {
      await sql`
        INSERT INTO warehouse (tenant_id, code, name, category, qty, min_qty, unit_cost, supplier, lead_time_days, location)
        VALUES (${TENANT_ID}, ${w.code}, ${w.name}, ${w.category}, ${w.qty}, ${w.minQty}, ${w.unitCost}, ${w.supplier}, ${w.leadTimeDays}, ${w.location})
        ON CONFLICT (code) DO NOTHING
      `;
    }

    // --- 5. Seed Contracts ---
    const contractItems = [
      { code: 'C001', client: 'Osp. San Raffaele', contact: 'Dr. Lucia Bianchi', email: 'l.bianchi@sanraffaele.it', contractType: 'Full Service', value: 84000, startDate: '2024-01-01', endDate: '2024-12-31', status: 'active', slaResponseHours: 4, slaResolutionHours: 24, devicesCount: 2 },
      { code: 'C002', client: 'Osp. Niguarda', contact: 'Ing. Fabio Conti', email: 'f.conti@niguarda.it', contractType: 'Time & Material', value: 36000, startDate: '2024-03-01', endDate: '2025-02-28', status: 'active', slaResponseHours: 8, slaResolutionHours: 48, devicesCount: 3 },
      { code: 'C003', client: 'Clinica Humanitas', contact: 'Dr. Elena Marini', email: 'e.marini@humanitas.it', contractType: 'Preventiva Only', value: 18000, startDate: '2024-06-01', endDate: '2025-05-31', status: 'active', slaResponseHours: 24, slaResolutionHours: 72, devicesCount: 2 },
    ];

    for (const c of contractItems) {
      await sql`
        INSERT INTO contracts (tenant_id, code, client, contact, email, contract_type, value, start_date, end_date, status, sla_response_hours, sla_resolution_hours, devices_count)
        VALUES (${TENANT_ID}, ${c.code}, ${c.client}, ${c.contact}, ${c.email}, ${c.contractType}, ${c.value}, ${c.startDate}, ${c.endDate}, ${c.status}, ${c.slaResponseHours}, ${c.slaResolutionHours}, ${c.devicesCount})
        ON CONFLICT (code) DO NOTHING
      `;
    }

    // --- 6. Seed Offers ---
    const offerItems = [
      { number: 'OFF-2024/001', client: 'Osp. San Raffaele', amount: 42500, vatRate: 22, status: 'accepted', validUntil: '2024-08-01', description: 'Canone semestrale contratto Full Service C001 (I semestre 2024)' },
      { number: 'OFF-2024/002', client: 'Osp. Niguarda', amount: 18000, vatRate: 22, status: 'sent', validUntil: '2025-04-01', description: 'Rinnovo contratto Time & Material 2025' },
      { number: 'OFF-2024/003', client: 'Clinica Humanitas', amount: 8500, vatRate: 22, status: 'draft', validUntil: '2025-06-01', description: 'Upgrade contratto a Full Service' },
    ];

    for (const o of offerItems) {
      await sql`
        INSERT INTO offers (tenant_id, number, client, amount, vat_rate, status, valid_until, description)
        VALUES (${TENANT_ID}, ${o.number}, ${o.client}, ${o.amount}, ${o.vatRate}, ${o.status}, ${o.validUntil}, ${o.description})
        ON CONFLICT DO NOTHING
      `;
    }

    // --- 7. Seed Notifications ---
    const notifItems = [
      { title: 'Intervento INT-2403 in attesa', message: 'Defibrillatore Zoll — Pronto Soccorso Niguarda', notificationType: 'alert', severity: 'high', category: 'Interventi' },
      { title: 'Scorta bassa: Modulo SpO2', message: 'Quantita: 2 (minimo: 2)', notificationType: 'warning', severity: 'medium', category: 'Magazzino' },
      { title: 'Intervento INT-2401 completato', message: 'Ventilatore SERVO-U riparato — Health 94%', notificationType: 'success', severity: 'low', category: 'Interventi' },
    ];

    for (const n of notifItems) {
      await sql`
        INSERT INTO notifications (tenant_id, title, message, notification_type, severity, category)
        VALUES (${TENANT_ID}, ${n.title}, ${n.message}, ${n.notificationType}, ${n.severity}, ${n.category})
      `;
    }

    // --- 8. Seed Fleet ---
    const fleetItems = [
      { plate: 'FJ 482 KT', model: 'Fiat Ducato L2H2', techName: 'Marco Rossi', status: 'active', kmToday: 47, lastPosition: 'Osp. Niguarda — Radiologia' },
      { plate: 'GN 119 RZ', model: 'Fiat Doblo Cargo', status: 'parked', kmToday: 0, lastPosition: 'Sede MGX Medical — Parcheggio' },
      { plate: 'EM 755 WB', model: 'Ford Transit Custom', status: 'maintenance', kmToday: 0, lastPosition: 'Officina AutoService Milano' },
      { plate: 'HB 203 PL', model: 'Citroen Berlingo', status: 'parked', kmToday: 0, lastPosition: 'Sede MGX Medical — Parcheggio' },
    ];

    for (const f of fleetItems) {
      await sql`
        INSERT INTO fleet (tenant_id, plate, model, tech_name, status, km_today, last_position)
        VALUES (${TENANT_ID}, ${f.plate}, ${f.model}, ${f.techName || null}, ${f.status}, ${f.kmToday}, ${f.lastPosition})
        ON CONFLICT DO NOTHING
      `;
    }

    // --- 9. Seed Equipment ---
    const equipItems = [
      { code: 'EQ-001', name: 'Multimetro Fluke 179', category: 'Strumentazione', status: 'in-use' },
      { code: 'EQ-002', name: 'Simulatore paziente Fluke ProSim 4', category: 'Simulatori', status: 'available' },
      { code: 'EQ-003', name: 'Tester sicurezza elettrica Fluke ESA615', category: 'Strumentazione', status: 'in-use' },
      { code: 'EQ-004', name: 'Kit utensili isolati VDE', category: 'Utensili', status: 'in-use' },
    ];

    for (const e of equipItems) {
      await sql`
        INSERT INTO equipment (tenant_id, code, name, category, status)
        VALUES (${TENANT_ID}, ${e.code}, ${e.name}, ${e.category}, ${e.status})
        ON CONFLICT (code) DO NOTHING
      `;
    }

    return res.status(200).json({
      ok: true,
      seeded: {
        users: users.length,
        devices: devices.length,
        interventions: interventions.length,
        warehouse: warehouseItems.length,
        contracts: contractItems.length,
        offers: offerItems.length,
        notifications: notifItems.length,
        fleet: fleetItems.length,
        equipment: equipItems.length,
      },
    });
  } catch (err) {
    console.error('[Seed Error]', err);
    return res.status(500).json({ error: err.message });
  }
}
