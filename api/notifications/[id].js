import { getSQL } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { handleError, methodNotAllowed } from '../_lib/errors.js';
import { toCamel } from '../_lib/caseTransform.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const sql = getSQL();

  if (req.method === 'PUT') {
    const b = req.body || {};
    try {
      const rows = await sql`
        UPDATE notifications SET
          is_read = COALESCE(${b.isRead ?? null}, is_read),
          is_pinned = COALESCE(${b.isPinned ?? null}, is_pinned)
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Notifica non trovata' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  if (req.method === 'DELETE') {
    try {
      const rows = await sql`
        DELETE FROM notifications
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
        RETURNING id
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Notifica non trovata' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'PUT, DELETE');
}
