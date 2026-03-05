import { getSQL } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { handleError, methodNotAllowed } from '../_lib/errors.js';
import { toCamel } from '../_lib/caseTransform.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'PUT') return methodNotAllowed(res, 'PUT');

  const { id } = req.query;
  const b = req.body || {};
  const sql = getSQL();

  try {
    const rows = await sql`
      UPDATE equipment SET
        code = COALESCE(${b.code ?? null}, code),
        name = COALESCE(${b.name ?? null}, name),
        category = COALESCE(${b.category ?? null}, category),
        status = COALESCE(${b.status ?? null}, status),
        assigned_to = COALESCE(${b.assignedTo ?? null}, assigned_to),
        calibration_due = COALESCE(${b.calibrationDue ?? null}, calibration_due),
        last_used = COALESCE(${b.lastUsed ?? null}, last_used)
      WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
      RETURNING *
    `;
    if (rows.length === 0) return res.status(404).json({ error: 'Attrezzatura non trovata' });
    return res.status(200).json(toCamel(rows[0]));
  } catch (err) {
    return handleError(res, err);
  }
}
