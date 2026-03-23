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
        SELECT * FROM invoices WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Fattura non trovata' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  if (req.method === 'PUT') {
    const b = req.body || {};
    try {
      const rows = await sql`
        UPDATE invoices SET
          number = COALESCE(${b.number ?? null}, number),
          client = COALESCE(${b.client ?? null}, client),
          amount = COALESCE(${b.amount != null ? parseFloat(b.amount) : null}, amount),
          vat_rate = COALESCE(${b.vatRate ?? null}, vat_rate),
          status = COALESCE(${b.status ?? null}, status),
          issue_date = COALESCE(${b.issueDate ?? null}, issue_date),
          due_date = COALESCE(${b.dueDate ?? null}, due_date),
          paid_at = COALESCE(${b.paidAt ?? null}, paid_at),
          intervention_id = COALESCE(${b.interventionId ?? null}, intervention_id),
          notes = COALESCE(${b.notes ?? null}, notes)
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Fattura non trovata' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  if (req.method === 'DELETE') {
    try {
      const rows = await sql`
        DELETE FROM invoices
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
        RETURNING id
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Fattura non trovata' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, PUT, DELETE');
}
