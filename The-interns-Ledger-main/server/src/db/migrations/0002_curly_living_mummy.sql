CREATE TYPE "public"."submission_status" AS ENUM('submitted_to_department', 'changes_requested', 'department_approved');--> statement-breakpoint
CREATE TABLE "attention_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supervisor_id" uuid NOT NULL,
	"hours_behind_threshold_pct" integer DEFAULT 20 NOT NULL,
	"weeks_remaining_threshold" integer DEFAULT 4 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attention_rules_supervisor_id_unique" UNIQUE("supervisor_id")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "internship_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"internship_id" uuid NOT NULL,
	"status" "submission_status" DEFAULT 'submitted_to_department' NOT NULL,
	"department_supervisor_id" uuid,
	"comment" text,
	"sealed_report_id" uuid,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "submission_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"log_entry_id" uuid,
	"comment" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervisor_departments" (
	"supervisor_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ALTER COLUMN "kind" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."assignment_kind";--> statement-breakpoint
CREATE TYPE "public"."assignment_kind" AS ENUM('industry');--> statement-breakpoint
ALTER TABLE "assignments" ALTER COLUMN "kind" SET DATA TYPE "public"."assignment_kind" USING "kind"::"public"."assignment_kind";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DEFAULT 'industry_supervisor'::text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'industry_supervisor', 'department_supervisor', 'admin');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DEFAULT 'industry_supervisor'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "department_id" uuid;--> statement-breakpoint
ALTER TABLE "attention_rules" ADD CONSTRAINT "attention_rules_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_submissions" ADD CONSTRAINT "internship_submissions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_submissions" ADD CONSTRAINT "internship_submissions_internship_id_internships_id_fk" FOREIGN KEY ("internship_id") REFERENCES "public"."internships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_submissions" ADD CONSTRAINT "internship_submissions_department_supervisor_id_users_id_fk" FOREIGN KEY ("department_supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_flags" ADD CONSTRAINT "submission_flags_submission_id_internship_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."internship_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_flags" ADD CONSTRAINT "submission_flags_log_entry_id_log_entries_id_fk" FOREIGN KEY ("log_entry_id") REFERENCES "public"."log_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_flags" ADD CONSTRAINT "submission_flags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisor_departments" ADD CONSTRAINT "supervisor_departments_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisor_departments" ADD CONSTRAINT "supervisor_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_supervisor_department" ON "supervisor_departments" USING btree ("supervisor_id","department_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;