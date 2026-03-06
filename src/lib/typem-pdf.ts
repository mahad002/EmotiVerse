/**
 * Generate a PDF from a Type M document (title + sections) or a single section.
 * Uses sensible typography: title, section headings, body text with wrapping and pagination.
 */

import { jsPDF } from 'jspdf';

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4 mm
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TITLE_FONT_SIZE = 18;
const SECTION_TITLE_FONT_SIZE = 13;
const BODY_FONT_SIZE = 11;
const LINE_HEIGHT_BODY = BODY_FONT_SIZE * 0.45; // mm per line
const LINE_HEIGHT_HEADING = SECTION_TITLE_FONT_SIZE * 0.5;
const TITLE_MARGIN_BOTTOM = 8;
const SECTION_MARGIN_BOTTOM = 6;

export interface SectionForPdf {
  title: string;
  content: string;
}

/**
 * Build a PDF for a full document (title + sections).
 * Saves as filename via doc.save(filename).
 */
export function buildDocumentPdf(
  title: string,
  sections: SectionForPdf[],
  filename?: string
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  // Title
  doc.setFontSize(TITLE_FONT_SIZE);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(title, CONTENT_WIDTH);
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * (TITLE_FONT_SIZE * 0.45) + TITLE_MARGIN_BOTTOM;

  const pageHeight = doc.internal.pageSize.getHeight();
  const maxY = pageHeight - MARGIN;

  for (const section of sections) {
    if (section.title) {
      if (y + SECTION_TITLE_FONT_SIZE + LINE_HEIGHT_HEADING > maxY) {
        doc.addPage();
        y = MARGIN;
      }
      doc.setFontSize(SECTION_TITLE_FONT_SIZE);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, MARGIN, y);
      y += LINE_HEIGHT_HEADING + 2;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(BODY_FONT_SIZE);
    const bodyLines = doc.splitTextToSize(section.content || '(No content)', CONTENT_WIDTH);
    for (const line of bodyLines) {
      if (y + LINE_HEIGHT_BODY > maxY) {
        doc.addPage();
        y = MARGIN;
      }
      doc.text(line, MARGIN, y);
      y += LINE_HEIGHT_BODY;
    }
    y += SECTION_MARGIN_BOTTOM;
  }

  const safeName = (filename ?? (title.replace(/[^a-z0-9]/gi, '-') || 'document').slice(0, 50)) + '.pdf';
  doc.save(safeName);
}

/**
 * Build a PDF for a single section (e.g. one email, letter, essay).
 * Title is shown at top; content is the body.
 */
export function buildSectionPdf(
  title: string,
  content: string,
  filename?: string
): void {
  const baseName = filename ?? title.replace(/[^a-z0-9]/gi, '-').slice(0, 50);
  buildDocumentPdf(title, [{ title: '', content }], baseName);
}
