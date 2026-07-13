const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_X1MeBFcKHRA4@ep-wandering-sea-abjzd5id-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });

async function listUsers() {
  try {
    const res = await pool.query('SELECT email FROM users');
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

listUsers();
