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
        SELECT * FROM warehouse WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Articolo non trovato' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  if (req.method === 'PUT') {
    const b = req.body || {};
    try {
      const rows = await sql`
        UPDATE warehouse SET
          code = COALESCE(${b.code ?? null}, code),
          name = COALESCE(${b.name ?? null}, name),
          category = COALESCE(${b.category ?? null}, category),
          qty = COALESCE(${b.qty ?? null}, qty),
          min_qty = COALESCE(${b.minQty ?? null}, min_qty),
          unit_cost = COALESCE(${b.unitCost ?? null}, unit_cost),
          supplier = COALESCE(${b.supplier ?? null}, supplier),
          lead_time_days = COALESCE(${b.leadTimeDays ?? null}, lead_time_days),
          location = COALESCE(${b.location ?? null}, location),
          compatible = COALESCE(${b.compatible ?? null}, compatible)
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Articolo non trovato' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, PUT');
}
