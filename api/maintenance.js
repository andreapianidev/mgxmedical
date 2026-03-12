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
        SELECT * FROM scheduled_maintenance
        WHERE tenant_id = ${user.tenantId}
        ORDER BY scheduled_date ASC
      `;
      return res.status(200).json(rows.map(toCamel));
    } catch (err) {
      return handleError(res, err);
    }
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    try {
      const rows = await sql`
        INSERT INTO scheduled_maintenance (
          tenant_id, device_id, device_name, structure,
          tech_id, tech_name, scheduled_date, status, frequency, notes
        ) VALUES (
          ${user.tenantId}, ${b.deviceId || null}, ${b.deviceName || null},
          ${b.structure || null}, ${b.techId || null}, ${b.techName || null},
          ${b.scheduledDate || null}, ${b.status || 'planned'},
          ${b.frequency || null}, ${b.notes || null}
        ) RETURNING *
      `;
      return res.status(201).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, POST');
}
