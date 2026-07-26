import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = env.SMTP_USER && env.SMTP_PASS ? nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
}) : null;

async function send(to: string, subject: string, html: string) {
  if (!transporter) {
    console.log(`[email:dev] to=${to} subject="${subject}"\n${html}`);
    return;
  }
  
  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
}

const card = (title: string, body: string, cta: { href: string; label: string }) => `
  <div style="font-family:Inter,Arial,sans-serif;background:#FBF5DD;padding:32px">
    <div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #E7E1B1">
      <h2 style="color:#0D530E;margin-top:0">${title}</h2>
      <p style="color:#030302;line-height:1.6">${body}</p>
      <a href="${cta.href}" style="display:inline-block;background:#0D530E;color:#fff;border-radius:999px;padding:12px 24px;text-decoration:none">${cta.label}</a>
      <p style="color:#777;font-size:12px;margin-bottom:0">Interns Ledger</p>
    </div>
  </div>`;

export const sendVerificationEmail = (to: string, token: string) =>
  send(to, "Verify your Interns Ledger email",
    card("Confirm your email", "Click below to activate your Interns Ledger account. The link is single-use and expires in 24 hours.",
      { href: `${env.CLIENT_ORIGIN}/verify-email?token=${token}`, label: "Verify email" }));

export const sendResetEmail = (to: string, token: string) =>
  send(to, "Reset your Interns Ledger password",
    card("Reset your password", "Click below to choose a new password. The link is single-use and expires in 30 minutes.",
      { href: `${env.CLIENT_ORIGIN}/reset?token=${token}`, label: "Reset password" }));

export const sendProvisionEmail = (to: string, name: string, resetToken: string) =>
  send(to, "Your Interns Ledger account is ready",
    card("Welcome to Interns Ledger", `Hello ${name}, an administrator has provisioned your account. Set your password to get started. This link is valid for 7 days.`,
      { href: `${env.CLIENT_ORIGIN}/reset?token=${resetToken}`, label: "Set your password" }));

export const sendSupervisorInviteEmail = (to: string, studentName: string, company: string, role: string, token: string) =>
  send(to, `${studentName} invited you to review their internship logs`,
    card("Supervisor Invitation", `Hello, ${studentName} has invited you to be their ${role === "faculty_supervisor" ? "Faculty" : "Industry"} Supervisor for their internship at ${company}. Please accept this invitation to create your account and review their logs.`,
      { href: `${env.CLIENT_ORIGIN}/invite?token=${token}`, label: "Accept Invitation" }));
