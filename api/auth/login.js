import bcrypt from 'bcryptjs';
import { getSQL } from '../_lib/db.js';
import { signToken, setAuthCookie } from '../_lib/auth.js';
import { handleError } from '../_lib/errors.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password richiesti' });
  }

  const sql = getSQL();

  try {
    const users = await sql`
      SELECT id, tenant_id, email, password_hash, name, avatar, role, color, is_active
      FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account disattivato' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const token = signToken({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
    });

    setAuthCookie(res, token);

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        email: user.email,
        color: user.color,
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
}
