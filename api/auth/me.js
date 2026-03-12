import { verifyToken } from '../_lib/auth.js';
import { getSQL } from '../_lib/db.js';
import { handleError } from '../_lib/errors.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const payload = verifyToken(req);
  if (!payload) {
    return res.status(401).json({ error: 'Non autenticato' });
  }

  const sql = getSQL();

  try {
    const users = await sql`
      SELECT id, name, avatar, role, email, color
      FROM users WHERE id = ${payload.userId} AND is_active = true
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    return res.status(200).json({ user: users[0] });
  } catch (err) {
    return handleError(res, err);
  }
}
