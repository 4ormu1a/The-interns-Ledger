import { eq } from 'drizzle-orm';
import { db } from './src/db/client.js';
import { users } from './src/db/schema/index.js';

async function check() {
  const u = await db.query.users.findFirst({
    where: eq(users.email, 'ce-asalifu4922@st.umat.edu.gh')
  });
  console.log('User exists:', !!u);
  if (u) {
    console.log('ID:', u.id);
  }
  
  const allUsers = await db.query.users.findMany();
  console.log('Total users in DB:', allUsers.length);
  allUsers.forEach(x => console.log(' ->', x.email));
  process.exit(0);
}
check();
