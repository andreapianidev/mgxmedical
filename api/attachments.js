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
        SELECT * FROM attachments
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
        INSERT INTO attachments (
          tenant_id, intervention_id, phase, file_url,
          file_name, uploaded_by, tech_name, description
        ) VALUES (
          ${user.tenantId}, ${b.interventionId || null},
          ${b.phase || null}, ${b.fileUrl || ''},
          ${b.fileName || null}, ${b.uploadedBy || null},
          ${b.techName || null}, ${b.description || null}
        ) RETURNING *
      `;
      return res.status(201).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, POST');
}
