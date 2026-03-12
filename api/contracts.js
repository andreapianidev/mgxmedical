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
        SELECT * FROM contracts
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
    try {
      const rows = await sql`
        INSERT INTO contracts (
          tenant_id, code, client, contact, email, contract_type,
          value, start_date, end_date, status,
          sla_response_hours, sla_resolution_hours, devices_count, covered_categories
        ) VALUES (
          ${user.tenantId}, ${b.code}, ${b.client}, ${b.contact || null},
          ${b.email || null}, ${b.contractType || null}, ${b.value || 0},
          ${b.startDate || null}, ${b.endDate || null},
          ${b.status || 'active'}, ${b.slaResponseHours || null},
          ${b.slaResolutionHours || null}, ${b.devicesCount || 0},
          ${b.coveredCategories || []}
        ) RETURNING *
      `;
      return res.status(201).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, POST');
}
