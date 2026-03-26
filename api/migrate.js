import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Drop old users table with Italian columns and recreate with English schema
    await sql`DROP TABLE IF EXISTS users CASCADE`;

    await sql`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        role TEXT NOT NULL DEFAULT 'technician',
        color TEXT DEFAULT '#333333',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Re-insert demo users
    const users = [
      { email: 'a.ferretti@mgxmedical.com', password: 'admin123', name: 'Alessandro Ferretti', avatar: 'AF', role: 'admin', color: '#1B4F72' },
      { email: 'm.rossi@mgxmedical.com', password: 'tecnico123', name: 'Marco Rossi', avatar: 'MR', role: 'technician', color: '#148F77' },
      { email: 's.colombo@mgxmedical.com', password: 'segr123', name: 'Sara Colombo', avatar: 'SC', role: 'secretary', color: '#8E44AD' },
      { email: 'demo@cliente.it', password: 'cliente123', name: 'Demo Cliente', avatar: 'DC', role: 'client', color: '#E67E22' },
    ];

    const inserted = [];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      const rows = await sql`
        INSERT INTO users (tenant_id, email, password_hash, name, avatar, role, color)
        VALUES (${TENANT_ID}, ${u.email}, ${hash}, ${u.name}, ${u.avatar}, ${u.role}, ${u.color})
        RETURNING id, email, name, role
      `;
      inserted.push(rows[0]);
    }

    return res.status(200).json({
      success: true,
      message: 'Users table migrated to English schema and seeded',
      users: inserted,
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      code: err.code,
    });
  }
}
