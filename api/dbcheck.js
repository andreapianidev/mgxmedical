import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Check users table columns
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    // Check if users table has any rows
    const count = await sql`SELECT count(*) as cnt FROM users`;

    // List all tables
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    return res.status(200).json({
      users_columns: columns,
      users_count: count[0]?.cnt,
      all_tables: tables.map(t => t.table_name),
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
      code: err.code,
      name: err.constructor?.name,
    });
  }
}
