import { getSQL } from '../../_lib/db.js';
import { requireAuth } from '../../_lib/auth.js';
import { handleError, methodNotAllowed } from '../../_lib/errors.js';
import { toCamel } from '../../_lib/caseTransform.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const sql = getSQL();

  try {
    const rows = await sql`
      UPDATE offers SET status = 'accepted', accepted_at = NOW()
      WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
      RETURNING *
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Offerta non trovata' });
    return res.status(200).json(toCamel(rows[0]));
  } catch (err) {
    return handleError(res, err);
  }
}
