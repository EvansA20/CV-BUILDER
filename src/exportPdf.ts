import { jsPDF } from "jspdf";
import type { CVDocument } from "./types";
import { isSafeExternalUrl } from "./types";

type RGB = [number, number, number];

const accents: Record<CVDocument["template"], RGB> = {
  "modern-pro": [23, 105, 255],
  classic: [49, 59, 76],
  creative: [137, 71, 170],
  minimal: [72, 83, 96],
};

export function downloadCVPdf(cv: CVDocument): void {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const accent = accents[cv.template];
  const serif = cv.template === "classic";
  const font = serif ? "times" : "helvetica";
  let y = 20;

  const addPage = () => {
    pdf.addPage();
    y = 19;
    if (cv.template === "creative") pdf.setFillColor(...accent).rect(0, 0, 6, pageHeight, "F");
  };
  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) addPage();
  };
  const writeWrapped = (text: string, options: { size?: number; color?: RGB; bold?: boolean; gap?: number; url?: string } = {}) => {
    const { size = 9.5, color = [63, 70, 79], bold = false, gap = 1.25, url } = options;
    pdf.setFont(font, bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines: string[] = pdf.splitTextToSize(text, contentWidth);
    const lineHeight = size * 0.42;
    let cursor = 0;
    while (cursor < lines.length) {
      const availableLines = Math.floor((pageHeight - 16 - y) / lineHeight);
      if (availableLines < 1) { addPage(); continue; }
      const chunk = lines.slice(cursor, cursor + availableLines);
      const chunkY = y;
      pdf.text(chunk, margin, y);
      if (url) {
        const linkWidth = Math.min(contentWidth, Math.max(...chunk.map((line) => pdf.getTextWidth(line))));
        pdf.link(margin, chunkY - lineHeight * .8, linkWidth, chunk.length * lineHeight, { url });
      }
      y += chunk.length * lineHeight;
      cursor += chunk.length;
      if (cursor < lines.length) addPage();
    }
    y += gap;
  };
  const writeSection = (title: string) => {
    ensureSpace(14);
    y += 4;
    pdf.setDrawColor(224, 228, 235);
    pdf.setLineWidth(0.25);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 6;
    pdf.setFont(font, "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...accent);
    pdf.text(title.toUpperCase(), margin, y);
    y += 6;
  };
  const writeDate = (start: string, end: string) => {
    const label = [start, end].filter(Boolean).join(" – ");
    if (label) writeWrapped(label, { size: 8, color: [105, 112, 123], gap: 1 });
  };

  if (cv.template === "creative") pdf.setFillColor(...accent).rect(0, 0, 6, pageHeight, "F");
  if (cv.personal.photoData) {
    try {
      const format = cv.personal.photoData.startsWith("data:image/png") ? "PNG" : "JPEG";
      pdf.addImage(cv.personal.photoData, format, pageWidth - margin - 24, y - 2, 24, 24, undefined, "FAST");
    } catch {
      // A malformed optional image should not prevent the rest of the CV export.
    }
  }
  pdf.setFont(font, "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(24, 34, 51);
  const nameWidth = cv.personal.photoData ? contentWidth - 31 : contentWidth;
  const nameLines = pdf.splitTextToSize(cv.personal.fullName || "Your Name", nameWidth);
  pdf.text(nameLines, margin, y + 4);
  y += Math.max(11, nameLines.length * 9);

  if (cv.personal.professionalTitle) writeWrapped(cv.personal.professionalTitle, { size: 11, color: accent, bold: true, gap: 2 });
  const contact = [cv.personal.email, cv.personal.phone, cv.personal.location].filter(Boolean).join("  ·  ");
  if (contact) writeWrapped(contact, { size: 8.5, color: [91, 99, 108], gap: 2 });
  const profiles = [cv.personal.linkedin, cv.personal.github, cv.personal.portfolio].filter((url) => isSafeExternalUrl(url));
  profiles.forEach((url) => writeWrapped(url, { size: 8, color: accent, gap: 1, url }));
  if (cv.personal.summary) {
    writeSection("Profile");
    writeWrapped(cv.personal.summary, { size: 9.5 });
  }

  if (cv.experience.length) {
    writeSection("Experience");
    cv.experience.forEach((item) => {
      ensureSpace(15);
      writeWrapped(item.position || "Position", { size: 10.5, bold: true, color: [35, 43, 55], gap: .5 });
      if (item.employer) writeWrapped(item.employer, { size: 9.5, color: accent, gap: .5 });
      writeDate(item.startDate, item.endDate);
      if (item.description) writeWrapped(item.description, { size: 9 });
      y += 2;
    });
  }

  if (cv.education.length) {
    writeSection("Education");
    cv.education.forEach((item) => {
      ensureSpace(15);
      writeWrapped(item.qualification || "Qualification", { size: 10.5, bold: true, color: [35, 43, 55], gap: .5 });
      const school = [item.institution, item.field].filter(Boolean).join(" · ");
      if (school) writeWrapped(school, { size: 9.5, color: accent, gap: .5 });
      writeDate(item.startDate, item.endDate);
      if (item.description) writeWrapped(item.description, { size: 9 });
      y += 2;
    });
  }

  if (cv.skills.length) {
    writeSection("Skills");
    writeWrapped(cv.skills.join("  ·  "), { size: 9.5 });
  }

  if (cv.certifications.length) {
    writeSection("Certifications");
    cv.certifications.forEach((item) => {
      ensureSpace(13);
      writeWrapped(item.name || "Certification", { size: 10, bold: true, color: [35, 43, 55], gap: .5 });
      const detail = [item.issuer, item.date].filter(Boolean).join(" · ");
      if (detail) writeWrapped(detail, { size: 9, color: [91, 99, 108] });
      if (isSafeExternalUrl(item.credentialUrl) && item.credentialUrl) writeWrapped(item.credentialUrl, { size: 8, color: accent, url: item.credentialUrl });
    });
  }

  if (cv.projects.length) {
    writeSection("Projects");
    cv.projects.forEach((item) => {
      ensureSpace(14);
      writeWrapped(item.name || "Project", { size: 10, bold: true, color: [35, 43, 55], gap: .5 });
      if (item.description) writeWrapped(item.description, { size: 9 });
      if (item.technologies.length) writeWrapped(item.technologies.join(" · "), { size: 8.5, color: [91, 99, 108] });
      [item.demoUrl, item.repositoryUrl].filter((url) => url && isSafeExternalUrl(url)).forEach((url) => {
        writeWrapped(url, { size: 8, color: accent, url });
      });
      y += 2;
    });
  }

  const safeName = (cv.personal.fullName || cv.title || "careerfy-cv")
    .normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  pdf.save(`${safeName || "careerfy-cv"}.pdf`);
}
