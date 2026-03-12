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
        SELECT * FROM activity_log
        WHERE tenant_id = ${user.tenantId}
        ORDER BY created_at DESC
        LIMIT 200
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
        INSERT INTO activity_log (
          tenant_id, user_id, user_name, action,
          entity_type, entity_id, details, session_id
        ) VALUES (
          ${user.tenantId}, ${user.userId},
          ${b.userName || null}, ${b.action},
          ${b.entityType || null}, ${b.entityId || null},
          ${JSON.stringify(b.details || {})}, ${b.sessionId || null}
        ) RETURNING *
      `;
      return res.status(201).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, POST');
}
