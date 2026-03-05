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
        UPDATE calendar_events SET
          title = COALESCE(${b.title ?? null}, title),
          event_type = COALESCE(${b.eventType ?? null}, event_type),
          event_date = COALESCE(${b.eventDate ?? null}, event_date),
          start_time = COALESCE(${b.startTime ?? null}, start_time),
          end_time = COALESCE(${b.endTime ?? null}, end_time),
          color = COALESCE(${b.color ?? null}, color),
          related_id = COALESCE(${b.relatedId ?? null}, related_id)
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Evento non trovato' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  if (req.method === 'DELETE') {
    try {
      const rows = await sql`
        DELETE FROM calendar_events
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
        RETURNING id
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Evento non trovato' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'PUT, DELETE');
}
