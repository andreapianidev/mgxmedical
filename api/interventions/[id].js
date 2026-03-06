import { getSQL } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { handleError, methodNotAllowed } from '../_lib/errors.js';
import { toCamel } from '../_lib/caseTransform.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const sql = getSQL();

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT * FROM interventions
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Intervento non trovato' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  if (req.method === 'PUT') {
    const b = req.body || {};
    try {
      const rows = await sql`
        UPDATE interventions SET
          code = COALESCE(${b.code ?? null}, code),
          device_id = COALESCE(${b.deviceId ?? null}, device_id),
          device_name = COALESCE(${b.deviceName ?? null}, device_name),
          device_serial = COALESCE(${b.deviceSerial ?? null}, device_serial),
          intervention_type = COALESCE(${b.interventionType ?? null}, intervention_type),
          tipologia_servizio = COALESCE(${b.tipologiaServizio ?? null}, tipologia_servizio),
          structure = COALESCE(${b.structure ?? null}, structure),
          department = COALESCE(${b.department ?? null}, department),
          referent = COALESCE(${b.referent ?? null}, referent),
          referent_email = COALESCE(${b.referentEmail ?? null}, referent_email),
          priority = COALESCE(${b.priority ?? null}, priority),
          status = COALESCE(${b.status ?? null}, status),
          assigned_techs = COALESCE(${b.assignedTechs ?? null}, assigned_techs),
          tech_name = COALESCE(${b.techName ?? null}, tech_name),
          sla_minutes = COALESCE(${b.slaMinutes ?? null}, sla_minutes),
          description = COALESCE(${b.description ?? null}, description),
          health_pre = COALESCE(${b.healthPre ?? null}, health_pre),
          notes = COALESCE(${b.notes ?? null}, notes),
          address = COALESCE(${b.address ?? null}, address),
          city = COALESCE(${b.city ?? null}, city),
          order_number = COALESCE(${b.orderNumber ?? null}, order_number),
          order_date = COALESCE(${b.orderDate ?? null}, order_date),
          request_channel = COALESCE(${b.requestChannel ?? null}, request_channel),
          request_reference = COALESCE(${b.requestReference ?? null}, request_reference),
          device_software_version = COALESCE(${b.deviceSoftwareVersion ?? null}, device_software_version),
          warranty_status = COALESCE(${b.warrantyStatus ?? null}, warranty_status),
          warranty_expiry = COALESCE(${b.warrantyExpiry ?? null}, warranty_expiry),
          fault_type = COALESCE(${b.faultType ?? null}, fault_type),
          work_performed = COALESCE(${b.workPerformed ?? null}, work_performed),
          root_cause = COALESCE(${b.rootCause ?? null}, root_cause),
          acknowledged_at = COALESCE(${b.acknowledgedAt ?? null}, acknowledged_at),
          started_at = COALESCE(${b.startedAt ?? null}, started_at)
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Intervento non trovato' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, PUT');
}
