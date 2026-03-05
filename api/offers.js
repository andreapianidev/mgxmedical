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
        SELECT * FROM offers
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
        INSERT INTO offers (
          tenant_id, number, client, amount, vat_rate, status,
          valid_until, intervention_id, description, notes
        ) VALUES (
          ${user.tenantId}, ${b.number || null}, ${b.client},
          ${b.amount || 0}, ${b.vatRate || 22}, ${b.status || 'draft'},
          ${b.validUntil || null}, ${b.interventionId || null},
          ${b.description || null}, ${b.notes || null}
        ) RETURNING *
      `;
      return res.status(201).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, POST');
}
