/** H1-H4 — PDF generation with pdf-lib (serverless-safe, no native deps). */
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import QRCode from "qrcode";
import { env } from "../../config/env.js";

export interface ReportEntry {
  workDate: string; hours: string; activity: string; skills: string[];
  version: number; digest: string; token: string | null;
}
export interface ReportData {
  type: "live" | "sealed";
  studentName: string; company: string; roleTitle: string;
  supervisorName: string; requiredHours: number;
  totalHours: number; entryCount: number; percent: number;
  entries: ReportEntry[];
  aggregateHash?: string; reportToken?: string; kid?: string;
  generatedAt: Date; verifyBaseUrl: string;
}

const GREEN = rgb(13 / 255, 83 / 255, 14 / 255);
const MUTED = rgb(0.36, 0.42, 0.33);

export async function buildReportPdf(d: ReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]); // A4
  let y = 800;

  const text = (s: string, x: number, size = 10, f = font, color = rgb(0.01, 0.01, 0.01)) => {
    page.drawText(s, { x, y, size, font: f, color });
  };
  const newPageIfNeeded = (need: number) => {
    if (y < need) { page = doc.addPage([595, 842]); y = 800; if (d.type === "live") watermark(); }
  };
  const watermark = () => {
    page.drawText("INTERIM — NOT SEALED", {
      x: 110, y: 380, size: 42, font: bold, color: rgb(0.85, 0.8, 0.62), rotate: degrees(35), opacity: 0.5,
    });
  };
  if (d.type === "live") watermark();

  text("THE INTERNS LEDGER", 50, 16, bold, GREEN); y -= 16;
  text(env.INSTITUTION_NAME, 50, 10, font, MUTED); y -= 24;
  text(d.type === "sealed" ? "SEALED INTERNSHIP REPORT" : "LIVE PROGRESS REPORT (INTERIM)", 50, 13, bold); y -= 18;
  text(`${d.studentName} — ${d.roleTitle}, ${d.company}`, 50, 11, bold); y -= 14;
  text(`Industry supervisor: ${d.supervisorName}   ·   Generated ${d.generatedAt.toISOString().slice(0, 10)}`, 50, 9, font, MUTED); y -= 14;
  text(`Approved hours: ${d.totalHours} / ${d.requiredHours} (${d.percent}%)   ·   Approved entries: ${d.entryCount}`, 50, 10, bold, GREEN); y -= 22;

  // report-level QR (sealed only — H2/FR-PDF-05)
  if (d.type === "sealed" && d.reportToken) {
    const qrPng = await QRCode.toBuffer(`${d.verifyBaseUrl}/verify/${d.reportToken}`, { margin: 0, width: 220 });
    const img = await doc.embedPng(qrPng);
    page.drawImage(img, { x: 460, y: 730, width: 86, height: 86 });
    page.drawText("Scan to verify report", { x: 458, y: 720, size: 7, font, color: MUTED });
    text(`Aggregate SHA-256: ${d.aggregateHash}`, 50, 8, font, MUTED); y -= 11;
    text(`Signed with institution key ${d.kid} (Ed25519) · token ${d.reportToken}`, 50, 8, font, MUTED); y -= 18;
  }

  for (const e of d.entries) {
    newPageIfNeeded(120);
    page.drawLine({ start: { x: 50, y: y + 6 }, end: { x: 545, y: y + 6 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.8) });
    y -= 8;
    text(`${e.workDate} · ${Number(e.hours)}h${e.version > 1 ? ` · v${e.version}` : ""}`, 50, 10, bold, GREEN);
    text(`seal ${e.digest.slice(0, 16)}…`, 380, 8, font, MUTED); y -= 13;
    const words = e.activity.replace(/\s+/g, " ").split(" ");
    let line = "";
    for (const w of words) {
      if ((line + " " + w).length > 95) { newPageIfNeeded(60); text(line, 50, 9); y -= 11; line = w; }
      else line = line ? line + " " + w : w;
    }
    if (line) { newPageIfNeeded(60); text(line, 50, 9); y -= 11; }
    text(`Skills: ${e.skills.join(", ")}`, 50, 8, font, MUTED); y -= 11;
    if (e.token) { text(`Verify: ${d.verifyBaseUrl}/verify/${e.token}`, 50, 7.5, font, MUTED); y -= 13; }
  }

  newPageIfNeeded(90);
  y -= 14;
  page.drawLine({ start: { x: 50, y }, end: { x: 280, y }, thickness: 0.7, color: rgb(0.3, 0.3, 0.3) });
  y -= 11;
  text(`${d.supervisorName} — Industry Supervisor (approvals recorded digitally)`, 50, 8, font, MUTED); y -= 12;
  text(d.type === "sealed"
    ? "This report is an immutable snapshot. Any alteration is detectable via the aggregate hash above."
    : "Interim report — regenerates as new entries are approved. Not sealed; carries no aggregate QR.", 50, 8, font, MUTED);

  return doc.save();
}
