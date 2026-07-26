const { Pool } = require('pg');

const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_X1MeBFcKHRA4@ep-wandering-sea-abjzd5id-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require' });

async function deleteUser() {
  const email = 'ce-asalifu4922@st.umat.edu.gh';
  try {
    const res = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (res.rows.length === 0) {
      console.log('User not found.');
      return;
    }
    const uid = res.rows[0].id;
    console.log('Found user:', uid);

    const safeDelete = async (query, params) => {
      try { await pool.query(query, params); } catch (e) { console.error('Failed:', query, e.message); }
    };

    await safeDelete('DELETE FROM login_attempts WHERE email = $1', [email]);
    await safeDelete('DELETE FROM email_tokens WHERE user_id = $1', [uid]);
    await safeDelete('DELETE FROM refresh_tokens WHERE user_id = $1', [uid]);
    
    // Notifications
    await safeDelete('DELETE FROM notifications WHERE recipient_id = $1', [uid]);

    // Submissions and flags
    await safeDelete('DELETE FROM submission_flags WHERE created_by = $1', [uid]);
    await safeDelete('DELETE FROM internship_submissions WHERE student_id = $1 OR department_supervisor_id = $1', [uid]);
    
    // Log entries, seals, comments
    await safeDelete('DELETE FROM entry_comments WHERE author_id = $1', [uid]);
    await safeDelete('DELETE FROM seals WHERE sealed_by = $1', [uid]);
    
    // Find all internships for this user
    const ints = await pool.query('SELECT id FROM internships WHERE student_id = $1 OR industry_supervisor_id = $1', [uid]);
    for (const int of ints.rows) {
       const iid = int.id;
       await safeDelete('DELETE FROM verification_tokens WHERE report_id IN (SELECT id FROM reports WHERE internship_id = $1)', [iid]);
       await safeDelete('DELETE FROM reports WHERE internship_id = $1', [iid]);
       await safeDelete('DELETE FROM assessments WHERE internship_id = $1', [iid]);
       
       await safeDelete('DELETE FROM verification_tokens WHERE entry_id IN (SELECT id FROM log_entries WHERE internship_id = $1)', [iid]);
       await safeDelete('DELETE FROM seals WHERE entry_id IN (SELECT id FROM log_entries WHERE internship_id = $1)', [iid]);
       await safeDelete('DELETE FROM entry_comments WHERE entry_id IN (SELECT id FROM log_entries WHERE internship_id = $1)', [iid]);
       await safeDelete('DELETE FROM log_entries WHERE internship_id = $1', [iid]);
       
       await safeDelete('DELETE FROM assignments WHERE internship_id = $1', [iid]);
       await safeDelete('DELETE FROM invitations WHERE internship_id = $1', [iid]);
       await safeDelete('DELETE FROM internships WHERE id = $1', [iid]);
    }
    
    await safeDelete('DELETE FROM supervisor_departments WHERE supervisor_id = $1', [uid]);
    await safeDelete('DELETE FROM attention_rules WHERE supervisor_id = $1', [uid]);

    // Finally the user
    await pool.query('DELETE FROM users WHERE id = $1', [uid]);

    console.log('Successfully deleted user and related data.');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

deleteUser();
