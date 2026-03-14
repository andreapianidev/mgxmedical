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
    if (!b.client) return res.status(400).json({ error: 'Client è richiesto' });

    // Compute amount from line items if provided, otherwise use amount directly
    const lineItems = Array.isArray(b.lineItems) ? b.lineItems : [];
    const computedAmount = lineItems.length > 0
      ? lineItems.reduce((sum, li) => sum + (parseFloat(li.qty) || 0) * (parseFloat(li.unitPrice) || 0), 0)
      : parseFloat(b.amount) || 0;

    if (computedAmount <= 0 && b.amount == null) {
      return res.status(400).json({ error: 'Importo o voci preventivo richiesti' });
    }

    try {
      const rows = await sql`
        INSERT INTO offers (
          tenant_id, number, client, amount, vat_rate, status,
          valid_until, intervention_id, description, notes, line_items
        ) VALUES (
          ${user.tenantId}, ${b.number || null}, ${b.client},
          ${computedAmount}, ${b.vatRate || 22}, ${b.status || 'draft'},
          ${b.validUntil || null}, ${b.interventionId || null},
          ${b.description || null}, ${b.notes || null},
          ${JSON.stringify(lineItems)}
        ) RETURNING *
      `;
      return res.status(201).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, POST');
}
