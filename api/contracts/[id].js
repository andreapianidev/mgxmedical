import { getSQL } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { handleError, methodNotAllowed } from '../_lib/errors.js';
import { toCamel } from '../_lib/caseTransform.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const sql = getSQL();

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT * FROM contracts WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Contratto non trovato' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  if (req.method === 'PUT') {
    const b = req.body || {};
    try {
      const rows = await sql`
        UPDATE contracts SET
          code = COALESCE(${b.code ?? null}, code),
          client = COALESCE(${b.client ?? null}, client),
          contact = COALESCE(${b.contact ?? null}, contact),
          email = COALESCE(${b.email ?? null}, email),
          contract_type = COALESCE(${b.contractType ?? null}, contract_type),
          value = COALESCE(${b.value ?? null}, value),
          start_date = COALESCE(${b.startDate ?? null}, start_date),
          end_date = COALESCE(${b.endDate ?? null}, end_date),
          status = COALESCE(${b.status ?? null}, status),
          sla_response_hours = COALESCE(${b.slaResponseHours ?? null}, sla_response_hours),
          sla_resolution_hours = COALESCE(${b.slaResolutionHours ?? null}, sla_resolution_hours),
          devices_count = COALESCE(${b.devicesCount ?? null}, devices_count),
          covered_categories = COALESCE(${b.coveredCategories ?? null}, covered_categories)
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Contratto non trovato' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, PUT');
}
