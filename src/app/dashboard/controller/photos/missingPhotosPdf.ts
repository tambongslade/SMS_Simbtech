// Printable list of the students who have no photo yet, grouped by class (A4, one table per class).

import jsPDF from 'jspdf';

export interface MissingPhotoGroup {
  className: string;
  /** Students in the class, with or without a photo. */
  total: number;
  students: { name: string; matricule?: string }[];
}

export interface MissingPhotosPdfText {
  title: string;
  subtitle: string;
  number: string;
  name: string;
  matricule: string;
  /** e.g. "12 of 45 without a photo" */
  classSummary: (missing: number, total: number) => string;
  continued: string;
  page: (n: number, of: number) => string;
}

const MARGIN = 15;
const ROW = 6.5;

export function missingPhotosPdf(groups: MissingPhotoGroup[], text: MissingPhotosPdfText): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const bottom = pageH - MARGIN - 6;
  const colNo = MARGIN;
  const colName = MARGIN + 12;
  const colMat = pageW - MARGIN - 38;
  let y = MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(text.title, MARGIN, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(text.subtitle, MARGIN, y + 11);
  doc.setTextColor(0);
  y += 19;

  const classHeading = (g: MissingPhotoGroup, continued: boolean) => {
    doc.setFillColor(235, 240, 250);
    doc.rect(MARGIN, y, pageW - 2 * MARGIN, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(continued ? `${g.className} (${text.continued})` : g.className, MARGIN + 2, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(text.classSummary(g.students.length, g.total), pageW - MARGIN - 2, y + 5.5, { align: 'right' });
    y += 8;
    doc.setFontSize(8.5);
    doc.setTextColor(110);
    doc.text(text.number, colNo + 1, y + 4.5);
    doc.text(text.name, colName, y + 4.5);
    doc.text(text.matricule, colMat, y + 4.5);
    doc.setTextColor(0);
    y += ROW;
  };

  for (const g of groups) {
    // Keep a class heading together with at least its first few names.
    if (y + 8 + ROW * 4 > bottom) {
      doc.addPage();
      y = MARGIN;
    }
    classHeading(g, false);
    g.students.forEach((s, i) => {
      if (y + ROW > bottom) {
        doc.addPage();
        y = MARGIN;
        classHeading(g, true);
      }
      doc.setFontSize(10);
      doc.text(String(i + 1), colNo + 1, y + 4.5);
      doc.text(doc.splitTextToSize(s.name, colMat - colName - 3)[0] ?? '', colName, y + 4.5);
      doc.text(s.matricule ?? '', colMat, y + 4.5);
      doc.setDrawColor(225);
      doc.line(MARGIN, y + ROW, pageW - MARGIN, y + ROW);
      y += ROW;
    });
    y += 6;
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(text.page(p, pages), pageW - MARGIN, pageH - MARGIN + 4, { align: 'right' });
  }
  return doc.output('blob');
}
