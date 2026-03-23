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
        SELECT * FROM invoices
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
    if (!b.client) return res.status(400).json({ error: 'Client è richiesto' });

    try {
      const rows = await sql`
        INSERT INTO invoices (
          tenant_id, number, client, amount, vat_rate, status,
          issue_date, due_date, intervention_id, notes
        ) VALUES (
          ${user.tenantId}, ${b.number || null}, ${b.client},
          ${parseFloat(b.amount) || 0}, ${b.vatRate || 22}, ${b.status || 'draft'},
          ${b.issueDate || null}, ${b.dueDate || null},
          ${b.interventionId || null}, ${b.notes || null}
        ) RETURNING *
      `;
      return res.status(201).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, POST');
}
