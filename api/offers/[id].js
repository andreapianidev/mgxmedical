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
        SELECT * FROM offers WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Offerta non trovata' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  if (req.method === 'PUT') {
    const b = req.body || {};
    try {
      const rows = await sql`
        UPDATE offers SET
          number = COALESCE(${b.number ?? null}, number),
          client = COALESCE(${b.client ?? null}, client),
          amount = COALESCE(${b.amount ?? null}, amount),
          vat_rate = COALESCE(${b.vatRate ?? null}, vat_rate),
          status = COALESCE(${b.status ?? null}, status),
          valid_until = COALESCE(${b.validUntil ?? null}, valid_until),
          intervention_id = COALESCE(${b.interventionId ?? null}, intervention_id),
          description = COALESCE(${b.description ?? null}, description),
          notes = COALESCE(${b.notes ?? null}, notes)
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Offerta non trovata' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, PUT');
}
