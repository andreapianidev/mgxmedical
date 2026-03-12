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
        SELECT * FROM devices
        WHERE tenant_id = ${user.tenantId}
        ORDER BY name ASC
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
        INSERT INTO devices (
          tenant_id, name, brand, model, serial_number, inventory_code,
          category, class_mdr, location, client, install_date, warranty_end,
          status, parent_id, supplier, list_price, has_serial, has_lot,
          expiry_date, software_version, health_score, notes, service_hours, mtbf
        ) VALUES (
          ${user.tenantId}, ${b.name}, ${b.brand || null}, ${b.model || null},
          ${b.serialNumber || null}, ${b.inventoryCode || null},
          ${b.category || null}, ${b.classMdr || null}, ${b.location || null},
          ${b.client || null}, ${b.installDate || null}, ${b.warrantyEnd || null},
          ${b.status || 'operative'}, ${b.parentId || null},
          ${b.supplier || null}, ${b.listPrice || null},
          ${b.hasSerial !== undefined ? b.hasSerial : true},
          ${b.hasLot !== undefined ? b.hasLot : false},
          ${b.expiryDate || null}, ${b.softwareVersion || null},
          ${b.healthScore || 100}, ${b.notes || null},
          ${b.serviceHours || 0}, ${b.mtbf || null}
        ) RETURNING *
      `;
      return res.status(201).json(toCamel(rows[0]));
    } catch (err) {
      return handleError(res, err);
    }
  }

  return methodNotAllowed(res, 'GET, POST');
}
