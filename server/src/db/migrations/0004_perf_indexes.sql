-- Performance indexes migration
-- These indexes eliminate full-table scans on the most frequently queried columns.
-- All indexes are created CONCURRENTLY so they do not lock the table during creation
-- on a live production database. Remove CONCURRENTLY if running inside a transaction.

-- ─── log_entries ─────────────────────────────────────────────────────────────
-- Composite index covering internship_id + state: used by every SUM(hours)/COUNT
-- correlated subquery in the department dashboard, /stats, and student profile.
-- This is the single highest-ROI index in the entire schema.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_log_entries_internship_state
  ON log_entries (internship_id, state);

-- student_id index: used by listEntries(), entries routes, and any student-scoped query.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_log_entries_student_id
  ON log_entries (student_id);

-- work_date + internship_id: used in ORDER BY / "last entry date" subqueries.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_log_entries_internship_workdate
  ON log_entries (internship_id, work_date DESC);

-- ─── internships ──────────────────────────────────────────────────────────────
-- student_id index: used by getOwnedActiveInternship() on every entry creation/submit.
-- Also used in submitEntry() to re-fetch the internship for window checking.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_internships_student_id
  ON internships (student_id);

-- student_id + status composite: getOwnedActiveInternship filters on both.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_internships_student_status
  ON internships (student_id, status);

-- ─── refresh_tokens ──────────────────────────────────────────────────────────
-- user_id index: used in logout (revoke all tokens for user) and password reset.
-- The token_hash column already has a UNIQUE constraint (which implies an index) ✓
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens (user_id);

-- ─── notifications ───────────────────────────────────────────────────────────
-- recipient_id index: used on every notification fetch (/api/me/notifications).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_recipient_id
  ON notifications (recipient_id);

-- ─── assignments ─────────────────────────────────────────────────────────────
-- internship_id index: used by assignedInternshipIds() on every review route call.
-- supervisor_id + kind composite: covers the exact filter in assignedInternshipIds().
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_supervisor_kind
  ON assignments (supervisor_id, kind);

-- ─── email_tokens ─────────────────────────────────────────────────────────────
-- purpose + used_at: used in verifyEmail() and resetPassword() to find unused tokens.
-- token_hash already has a UNIQUE constraint (which implies an index) ✓
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_tokens_user_purpose
  ON email_tokens (user_id, purpose);
