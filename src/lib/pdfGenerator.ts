import jsPDF from "jspdf";
import type { SelectedMaterial } from "@/components/MaterialSelector";

type EntryData = {
  datum: string;
  projekt: string;
  arbeitsschritt: string;
  bemerkung: string;
  material: SelectedMaterial[];
  benutzer: string;
};

const PRIMARY = [22, 62, 115] as const;   // #163E73
const TEAL    = [59, 187, 206] as const;  // #3BBBCE
const LIGHT   = [230, 238, 248] as const; // #E6EEF8

function setColor(doc: jsPDF, rgb: readonly [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

const MAX_IMG_PX = 1800; // resize to max 1800px on longest edge before embedding

/**
 * Converts any image file (incl. HEIC from iPhone) to a JPEG data URL,
 * resizes to MAX_IMG_PX, and corrects EXIF rotation via the browser canvas.
 */
function fileToJpegDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const scale = Math.min(1, MAX_IMG_PX / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Bild konnte nicht geladen werden: ${file.name}`));
    };
    img.src = objectUrl;
  });
}

export async function generatePDF(entry: EntryData, images: File[]): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = 210; // page width
  const margin = 15;
  const contentW = pw - margin * 2;
  let y = 0;

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pw, 22, "F");

  doc.setFillColor(...TEAL);
  doc.rect(0, 22, pw, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("Bautagebuch", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 210, 235);
  doc.text("Glasfaserausbau", margin + 48, 14);

  doc.setFontSize(9);
  doc.setTextColor(200, 225, 245);
  doc.text(`Erstellt: ${new Date().toLocaleString("de-DE")}`, pw - margin, 14, { align: "right" });

  y = 32;

  // ── Info grid ─────────────────────────────────────────────────────────────
  const col1 = margin;
  const col2 = margin + contentW / 2 + 3;
  const colW = contentW / 2 - 3;

  const fields: [string, string][] = [
    ["Datum", entry.datum],
    ["Projekt", entry.projekt],
    ["Arbeitsschritt", entry.arbeitsschritt],
    ["Erstellt von", entry.benutzer],
  ];

  fields.forEach(([label, val], i) => {
    const x = i % 2 === 0 ? col1 : col2;
    if (i % 2 === 0 && i > 0) y += 14;

    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, colW, 12, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setColor(doc, TEAL);
    doc.text(label.toUpperCase(), x + 3, y + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(doc, PRIMARY);
    doc.text(val || "–", x + 3, y + 9.5);
  });

  y += 18;

  // ── Bemerkung ─────────────────────────────────────────────────────────────
  if (entry.bemerkung) {
    doc.setFillColor(...LIGHT);
    const bemLines = doc.splitTextToSize(entry.bemerkung, contentW - 6);
    const bemH = Math.max(14, bemLines.length * 5 + 8);
    doc.roundedRect(margin, y, contentW, bemH, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setColor(doc, TEAL);
    doc.text("BEMERKUNG", margin + 3, y + 4.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(doc, PRIMARY);
    doc.text(bemLines, margin + 3, y + 9.5);

    y += bemH + 6;
  }

  // ── Materialtabelle ───────────────────────────────────────────────────────
  if (entry.material.length > 0) {
    // Section header
    doc.setFillColor(...PRIMARY);
    doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("MATERIALLISTE", margin + 3, y + 5.5);
    y += 10;

    // Table header
    const colWidths = [12, 90, 30, 25, 22];
    const colX = [margin, margin + 12, margin + 102, margin + 132, margin + 157];
    const headers = ["Pos.", "Beschreibung", "Artikel-Nr.", "Einheit", "Menge"];

    doc.setFillColor(...TEAL);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    headers.forEach((h, i) => {
      doc.text(h, colX[i] + 1.5, y + 5);
    });
    y += 7;

    // Rows
    entry.material.forEach(({ position, menge }, idx) => {
      const rowH = 7;
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 253);
        doc.rect(margin, y, contentW, rowH, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);

      const beschr = doc.splitTextToSize(position.beschreibung, colWidths[1] - 2);
      doc.text(String(position.nr), colX[0] + 1.5, y + 5);
      doc.text(beschr[0], colX[1] + 1.5, y + 5);
      doc.text(position.artikelNr, colX[2] + 1.5, y + 5);
      doc.text(position.einheit, colX[3] + 1.5, y + 5);
      doc.setFont("helvetica", "bold");
      doc.text(String(menge), colX[4] + 1.5, y + 5);
      y += rowH;

      // Check page break
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    });

    // Bottom border
    doc.setDrawColor(...TEAL);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentW, y);
    y += 8;
  }

  // ── Bilder ────────────────────────────────────────────────────────────────
  if (images.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }

    doc.setFillColor(...PRIMARY);
    doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("FOTOS", margin + 3, y + 5.5);
    y += 12;

    const imgW = (contentW - 5) / 2;
    const imgH = 65;
    let col = 0;

    for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
      const img = images[imgIdx];
      let dataUrl: string;

      try {
        dataUrl = await fileToJpegDataUrl(img);
      } catch (_) {
        // Image could not be loaded — draw a grey placeholder with filename
        const imgX = col === 0 ? margin : margin + imgW + 5;
        if (y + imgH > 275) { doc.addPage(); y = 20; col = 0; }
        doc.setFillColor(230, 230, 230);
        doc.rect(imgX, y, imgW, imgH, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text("Bild nicht darstellbar", imgX + imgW / 2, y + imgH / 2, { align: "center" });
        doc.text(img.name, imgX + imgW / 2, y + imgH / 2 + 5, { align: "center" });
        doc.text(`Foto ${imgIdx + 1}`, imgX, y + imgH + 4);
        col++;
        if (col === 2) { col = 0; y += imgH + 10; }
        continue;
      }

      const imgX = col === 0 ? margin : margin + imgW + 5;
      if (y + imgH > 275) { doc.addPage(); y = 20; col = 0; }

      doc.addImage(dataUrl, "JPEG", imgX, y, imgW, imgH, undefined, "MEDIUM");

      // Caption
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(`Foto ${imgIdx + 1}  ·  ${img.name}`, imgX, y + imgH + 4);

      col++;
      if (col === 2) { col = 0; y += imgH + 10; }
    }

    if (col === 1) y += imgH + 10;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = (doc as jsPDF & { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 292, pw, 8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(180, 210, 235);
    doc.text(`Glasfaser Bautagebuch · ${entry.benutzer} · ${entry.datum}`, margin, 297.5);
    doc.text(`Seite ${i} / ${pageCount}`, pw - margin, 297.5, { align: "right" });
  }

  return doc.output("blob");
}
