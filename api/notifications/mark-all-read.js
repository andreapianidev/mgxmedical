import { getSQL } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { handleError, methodNotAllowed } from '../_lib/errors.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  const user = requireAuth(req, res);
  if (!user) return;

  const sql = getSQL();

  try {
    await sql`
      UPDATE notifications SET is_read = true
      WHERE tenant_id = ${user.tenantId} AND is_read = false
    `;
    return res.status(200).json({ ok: true });
  } catch (err) {
    return handleError(res, err);
  }
}
