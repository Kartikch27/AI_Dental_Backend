import { Injectable } from '@nestjs/common';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

@Injectable()
export class PdfService {
  async generateContentPdf(title: string, content: string): Promise<Buffer> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 116, 252); // Brand Blue
    doc.text('AI Dental Exam Assistant', 105, 20, { align: 'center' });
    
    // Title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(title, 20, 40);
    
    // Content
    doc.setFontSize(11);
    const splitText = doc.splitTextToSize(content, 170);
    doc.text(splitText, 20, 50);
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    }

    return Buffer.from(doc.output('arraybuffer'));
  }
}
