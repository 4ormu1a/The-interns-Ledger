import { db, pool } from "./src/db/client.js";
import { users } from "./src/db/schema/index.js";
import { eq } from "drizzle-orm";

async function main() {
  const allUsers = await db.select({ email: users.email, status: users.status, role: users.role }).from(users);
  console.log("All users:", allUsers);
  await pool.end();
}
main().catch(console.error);
