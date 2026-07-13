const { Pool } = require('pg');

async function checkDb(name, url) {
  const pool = new Pool({ connectionString: url });
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    const cols = res.rows.map(r => r.column_name);
    console.log(name + ' has department_id: ' + cols.includes('department_id'));
  } catch(e) {
    console.log(name + ' error: ' + e.message);
  } finally {
    await pool.end();
  }
}

const url1 = 'postgresql://neondb_owner:npg_X1MeBFcKHRA4@ep-withered-hill-abud4b0g-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const url2 = 'postgresql://neondb_owner:npg_X1MeBFcKHRA4@ep-wandering-sea-abjzd5id-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

checkDb('ep-withered-hill', url1).then(() => checkDb('ep-wandering-sea', url2));
