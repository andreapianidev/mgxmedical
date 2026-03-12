import { getSQL } from './_lib/db.js';
import { requireAuth } from './_lib/auth.js';
import { handleError, methodNotAllowed } from './_lib/errors.js';
import { toCamel } from './_lib/caseTransform.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'GET') return methodNotAllowed(res, 'GET');

  const sql = getSQL();

  try {
    const rows = await sql`
      SELECT id, name, avatar, role, email, color
      FROM users
      WHERE tenant_id = ${user.tenantId} AND is_active = true
      ORDER BY name
    `;
    return res.status(200).json(rows.map(toCamel));
  } catch (err) {
    return handleError(res, err);
  }
}
