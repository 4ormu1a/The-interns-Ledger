import { users, loginAttempts, emailTokens, notifications, internships, logEntries, reports, internshipSubmissions, seals, entryComments, assessments } from './src/db/schema/index.js';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const pool = new pg.Pool({ connectionString: 'postgresql://neondb_owner:npg_X1MeBFcKHRA4@ep-wandering-sea-abjzd5id-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });
const prodDb = drizzle(pool);

async function deleteUser() {
  const email = 'ce-asalifu4922@st.umat.edu.gh';
  try {
    const user = await prodDb.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.length === 0) {
      console.log('User not found.');
      return;
    }
    const uid = user[0].id;
    console.log('Found user:', uid);

    // Clean up dependencies
    await prodDb.delete(loginAttempts).where(eq(loginAttempts.email, email));
    await prodDb.delete(emailTokens).where(eq(emailTokens.userId, uid));
    await prodDb.delete(notifications).where(eq(notifications.userId, uid));
    await prodDb.delete(entryComments).where(eq(entryComments.authorId, uid));
    await prodDb.delete(seals).where(eq(seals.createdBy, uid));
    
    // delete internship_submissions
    await prodDb.delete(internshipSubmissions).where(eq(internshipSubmissions.studentId, uid));
    
    await prodDb.delete(logEntries).where(eq(logEntries.studentId, uid));
    await prodDb.delete(assessments).where(eq(assessments.studentId, uid));
    await prodDb.delete(reports).where(eq(reports.studentId, uid));
    await prodDb.delete(internships).where(eq(internships.studentId, uid));

    await prodDb.delete(users).where(eq(users.id, uid));

    console.log('Successfully deleted user and related data.');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

deleteUser();
