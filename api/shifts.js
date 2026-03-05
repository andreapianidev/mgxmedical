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
        SELECT * FROM shifts
        WHERE tenant_id = ${user.tenantId}
        ORDER BY shift_date ASC
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
        INSERT INTO shifts (
          tenant_id, tech_id, tech_name, shift_type,
          shift_date, start_time, end_time
        ) VALUES (
          ${user.tenantId}, ${b.techId}, ${b.techName},
          ${b.shiftType || 'day'}, ${b.shiftDate},
          ${b.startTime || null}, ${b.endTime || null}
        ) RETURNING *
      `;
      return res.status(201).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, POST');
}
