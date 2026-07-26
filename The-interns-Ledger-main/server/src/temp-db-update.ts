import { db } from "./db/client.js";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Updating users...");
  try {
    // Forcefully update the text value of the enum in the users table, 
    // but wait, user_role is an enum type in Postgres. We might need to alter the enum type first or add the new value, update rows, then remove old value.
    // Drizzle-kit push tries to replace it.
    
    // Instead of raw query on users which will fail if enum value doesn't exist, let's alter the enum type directly to add the new value,
    // update rows, and then we let drizzle-kit push handle the rest.
    
    await db.execute(sql`ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'department_supervisor'`);
    await db.execute(sql`UPDATE users SET role = 'department_supervisor' WHERE role = 'faculty_supervisor'`);
    
    console.log("Successfully updated users.");
  } catch (error) {
    console.error("Error updating users:", error);
  }
  process.exit(0);
}

run();
