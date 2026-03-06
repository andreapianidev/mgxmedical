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
        SELECT * FROM devices WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Dispositivo non trovato' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  if (req.method === 'PUT') {
    const b = req.body || {};
    try {
      const rows = await sql`
        UPDATE devices SET
          name = COALESCE(${b.name ?? null}, name),
          brand = COALESCE(${b.brand ?? null}, brand),
          model = COALESCE(${b.model ?? null}, model),
          serial_number = COALESCE(${b.serialNumber ?? null}, serial_number),
          inventory_code = COALESCE(${b.inventoryCode ?? null}, inventory_code),
          category = COALESCE(${b.category ?? null}, category),
          class_mdr = COALESCE(${b.classMdr ?? null}, class_mdr),
          location = COALESCE(${b.location ?? null}, location),
          client = COALESCE(${b.client ?? null}, client),
          install_date = COALESCE(${b.installDate ?? null}, install_date),
          warranty_end = COALESCE(${b.warrantyEnd ?? null}, warranty_end),
          status = COALESCE(${b.status ?? null}, status),
          parent_id = COALESCE(${b.parentId ?? null}, parent_id),
          supplier = COALESCE(${b.supplier ?? null}, supplier),
          list_price = COALESCE(${b.listPrice ?? null}, list_price),
          has_serial = COALESCE(${b.hasSerial ?? null}, has_serial),
          has_lot = COALESCE(${b.hasLot ?? null}, has_lot),
          expiry_date = COALESCE(${b.expiryDate ?? null}, expiry_date),
          software_version = COALESCE(${b.softwareVersion ?? null}, software_version),
          health_score = COALESCE(${b.healthScore ?? null}, health_score),
          notes = COALESCE(${b.notes ?? null}, notes),
          service_hours = COALESCE(${b.serviceHours ?? null}, service_hours),
          mtbf = COALESCE(${b.mtbf ?? null}, mtbf)
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Dispositivo non trovato' });
      return res.status(200).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  if (req.method === 'DELETE') {
    try {
      const rows = await sql`
        DELETE FROM devices
        WHERE id = ${id}::uuid AND tenant_id = ${user.tenantId}
        RETURNING id
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Dispositivo non trovato' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, PUT, DELETE');
}
