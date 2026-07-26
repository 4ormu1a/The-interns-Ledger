import pg from "pg";
import { config } from "dotenv";

config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Adding index_number to users table...");
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS index_number text;`);
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

run();
