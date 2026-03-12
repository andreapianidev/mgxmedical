import { getSQL } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';
import { handleError, methodNotAllowed } from './_lib/errors.js';
import { toCamel } from './_lib/caseTransform.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const sql = getSQL();

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT * FROM interventions
        WHERE tenant_id = ${user.tenantId}
        ORDER BY created_at DESC
      `;
      return res.status(200).json(rows.map(toCamel));
    } catch (err) {
      return handleError(res, err);
    }
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    if (!b.code) return res.status(400).json({ error: 'Codice intervento è richiesto' });
    try {
      const rows = await sql`
        INSERT INTO interventions (
          tenant_id, code, device_id, device_name, device_serial,
          intervention_type, tipologia_servizio, structure, department,
          referent, referent_email, priority, status,
          assigned_techs, tech_name, sla_minutes, description,
          health_pre, notes,
          address, city, order_number, order_date,
          request_channel, request_reference,
          device_software_version, warranty_status, warranty_expiry
        ) VALUES (
          ${user.tenantId}, ${b.code}, ${b.deviceId || null}, ${b.deviceName || null},
          ${b.deviceSerial || null}, ${b.interventionType || null},
          ${b.tipologiaServizio || null}, ${b.structure || null},
          ${b.department || null}, ${b.referent || null},
          ${b.referentEmail || null}, ${b.priority || 'MEDIO'},
          'pending', ${b.assignedTechs || []}, ${b.techName || null},
          ${b.slaMinutes || 480}, ${b.description || null},
          ${b.healthPre || null}, ${b.notes || null},
          ${b.address || null}, ${b.city || null},
          ${b.orderNumber || null}, ${b.orderDate || null},
          ${b.requestChannel || null}, ${b.requestReference || null},
          ${b.deviceSoftwareVersion || null}, ${b.warrantyStatus || null},
          ${b.warrantyExpiry || null}
        ) RETURNING *
      `;
      return res.status(201).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, POST');
}
