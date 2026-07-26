import { sql } from "drizzle-orm";
import { db } from "./src/db/client.js";

async function run() {
  try {
    console.log("Adding index_number to users table...");
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS index_number text;`);
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}

run();
