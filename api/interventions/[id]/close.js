import { getSQL } from '../../_lib/db.js';
import { requireAuth } from '../../_lib/auth.js';
import { handleError, methodNotAllowed } from '../../_lib/errors.js';
import { toCamel } from '../../_lib/caseTransform.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST');

  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const b = req.body || {};

  const sql = getSQL();

  try {
    // Build transaction queries
    const txQueries = [];

    // 1. Update intervention with close data
    txQueries.push(sql`
      UPDATE interventions SET
        status = 'completed',
        closed_at = NOW(),
        outcome = ${b.outcome || null},
        health_post = ${b.healthPost || null},
        notes = COALESCE(${b.notes || null}, notes),
        parts_used = ${JSON.stringify(b.partsUsed || [])},
        fault_type = COALESCE(${b.faultType || null}, fault_type),
        work_performed = COALESCE(${b.workPerformed || null}, work_performed),
        root_cause = COALESCE(${b.rootCause || null}, root_cause),
        checklist_verifiche = ${JSON.stringify(b.checklistVerifiche || {})},
        repair_in_lab = COALESCE(${b.repairInLab ?? null}, repair_in_lab),
        needs_transfer = COALESCE(${b.needsTransfer ?? null}, needs_transfer),
        needs_spare_parts = COALESCE(${b.needsSpareParts ?? null}, needs_spare_parts),
        work_sessions = ${JSON.stringify(b.workSessions || [])},
        completion_location = COALESCE(${b.completionLocation || null}, completion_location),
        callout_fee = COALESCE(${b.calloutFee ?? null}, callout_fee),
        travel_fee = COALESCE(${b.travelFee ?? null}, travel_fee),
        signatures = ${JSON.stringify(b.signatures || {})}
      WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
      RETURNING *
    `);

    // 2. Update device health_score if provided
    if (b.healthPost != null && b.deviceId) {
      txQueries.push(sql`
        UPDATE devices SET health_score = ${b.healthPost}
        WHERE id = ${b.deviceId}::uuid AND tenant_id = ${user.tenantId}
      `);
    }

    // 3. Decrement warehouse parts
    if (b.partsUsed?.length > 0) {
      for (const part of b.partsUsed) {
        const qty = Number(part.qty);
        if (!part.code || !Number.isFinite(qty) || qty <= 0) continue;
        txQueries.push(sql`
          UPDATE warehouse SET qty = GREATEST(0, qty - ${qty})
          WHERE code = ${part.code} AND tenant_id = ${user.tenantId}
        `);
      }
    }

    // 4. Create notification
    txQueries.push(sql`
      INSERT INTO notifications (tenant_id, title, message, notification_type, severity, category, related_id)
      VALUES (
        ${user.tenantId},
        'Intervento chiuso',
        ${'Esito: ' + (b.outcome || '-') + ' — Health: ' + (b.healthPost || '-') + '%'},
        'success', 'low', 'Interventi', ${id}::uuid
      )
    `);

    // Execute all as a single transaction
    const results = await sql.transaction(txQueries);

    const closed = results[0]?.[0];
    if (!closed) {
      return res.status(404).json({ error: 'Intervento non trovato' });
    }
    return res.status(200).json(toCamel(closed));
  } catch (err) {
    return handleError(res, err);
  }
}
