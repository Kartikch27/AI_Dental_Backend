"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfService = void 0;
const common_1 = require("@nestjs/common");
const { jsPDF } = require('jspdf');
const BLUE = [40, 116, 252];
const DARK = [26, 26, 46];
const MUTED = [100, 100, 110];
function parseInline(raw) {
    const spans = [];
    const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let last = 0;
    let m;
    while ((m = re.exec(raw)) !== null) {
        if (m.index > last)
            spans.push({ text: raw.slice(last, m.index), bold: false, italic: false });
        if (m[2])
            spans.push({ text: m[2], bold: true, italic: false });
        else if (m[3])
            spans.push({ text: m[3], bold: false, italic: true });
        else if (m[4])
            spans.push({ text: m[4], bold: true, italic: false });
        last = m.index + m[0].length;
    }
    if (last < raw.length)
        spans.push({ text: raw.slice(last), bold: false, italic: false });
    return spans.length ? spans : [{ text: raw, bold: false, italic: false }];
}
class PdfRenderer {
    doc;
    y = 20;
    pageW = 210;
    pageH = 297;
    marginL = 18;
    marginR = 18;
    marginB = 20;
    maxW;
    constructor() {
        this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
        this.maxW = this.pageW - this.marginL - this.marginR;
    }
    newPageIfNeeded(needed = 6) {
        if (this.y + needed > this.pageH - this.marginB) {
            this.doc.addPage();
            this.y = 20;
        }
    }
    setFont(bold, italic) {
        const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
        this.doc.setFont('helvetica', style);
    }
    renderSpans(spans, fontSize, lineHeightMm, indentX = 0) {
        this.doc.setFontSize(fontSize);
        const startX = this.marginL + indentX;
        let x = startX;
        for (const span of spans) {
            this.setFont(span.bold, span.italic);
            const words = span.text.split(' ');
            for (let wi = 0; wi < words.length; wi++) {
                const word = words[wi];
                const spacer = wi > 0 || x > startX ? ' ' : '';
                const toRender = spacer + word;
                const w = this.doc.getTextWidth(toRender);
                if (x + w > this.marginL + this.maxW && x > startX) {
                    this.y += lineHeightMm;
                    this.newPageIfNeeded(lineHeightMm);
                    x = startX;
                    const ww = this.doc.getTextWidth(word);
                    this.doc.text(word, x, this.y);
                    x += ww;
                }
                else {
                    this.doc.text(toRender, x, this.y);
                    x += w;
                }
            }
        }
        this.y += lineHeightMm;
    }
    renderHeading(text, level) {
        const [sz, lh, gap] = {
            1: [18, 8, 4],
            2: [14, 7, 3],
            3: [12, 6, 2],
            4: [11, 5.5, 2],
        }[level];
        this.y += gap;
        this.newPageIfNeeded(lh + gap);
        if (level <= 2) {
            this.doc.setDrawColor(...BLUE);
            this.doc.setLineWidth(level === 1 ? 0.5 : 0.3);
        }
        this.doc.setTextColor(...(level === 1 || level === 3 ? DARK : BLUE));
        this.doc.setFontSize(sz);
        this.doc.setFont('helvetica', 'bold');
        const lines = this.doc.splitTextToSize(text, this.maxW);
        for (const line of lines) {
            this.newPageIfNeeded(lh);
            this.doc.text(line, this.marginL, this.y);
            this.y += lh;
        }
        if (level <= 2) {
            this.doc.line(this.marginL, this.y, this.marginL + this.maxW, this.y);
            this.y += 2;
        }
        this.doc.setTextColor(...DARK);
    }
    renderParagraph(spans) {
        this.newPageIfNeeded(6);
        this.doc.setTextColor(...DARK);
        this.doc.setFontSize(10);
        this.renderSpans(spans, 10, 5.5);
        this.y += 1;
    }
    renderBullet(text, indent = 0) {
        this.newPageIfNeeded(6);
        this.doc.setTextColor(...BLUE);
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('•', this.marginL + indent, this.y);
        this.doc.setTextColor(...DARK);
        this.renderSpans(parseInline(text), 10, 5.5, indent + 5);
    }
    renderNumbered(num, text, indent = 0) {
        this.newPageIfNeeded(6);
        this.doc.setTextColor(...BLUE);
        this.doc.setFontSize(10);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(`${num}.`, this.marginL + indent, this.y);
        this.doc.setTextColor(...DARK);
        this.renderSpans(parseInline(text), 10, 5.5, indent + 7);
    }
    renderHR() {
        this.y += 3;
        this.doc.setDrawColor(200, 210, 230);
        this.doc.setLineWidth(0.3);
        this.doc.line(this.marginL, this.y, this.marginL + this.maxW, this.y);
        this.y += 4;
    }
    renderBlockquote(text) {
        this.newPageIfNeeded(8);
        this.doc.setFillColor(240, 244, 255);
        this.doc.setDrawColor(...BLUE);
        this.doc.setLineWidth(0.5);
        this.doc.rect(this.marginL, this.y - 3, this.maxW, 8, 'F');
        this.doc.line(this.marginL, this.y - 3, this.marginL, this.y + 5);
        this.doc.setTextColor(...MUTED);
        this.doc.setFontSize(9.5);
        this.doc.setFont('helvetica', 'italic');
        const lines = this.doc.splitTextToSize(text, this.maxW - 6);
        for (const line of lines) {
            this.doc.text(line, this.marginL + 4, this.y);
            this.y += 5;
        }
        this.doc.setTextColor(...DARK);
        this.y += 2;
    }
    renderMarkdown(md) {
        const lines = md.replace(/\r\n/g, '\n').split('\n');
        for (const line of lines) {
            if (/^#### (.+)/.test(line)) {
                this.renderHeading(line.slice(5), 4);
            }
            else if (/^### (.+)/.test(line)) {
                this.renderHeading(line.slice(4), 3);
            }
            else if (/^## (.+)/.test(line)) {
                this.renderHeading(line.slice(3), 2);
            }
            else if (/^# (.+)/.test(line)) {
                this.renderHeading(line.slice(2), 1);
            }
            else if (/^---+$/.test(line.trim())) {
                this.renderHR();
            }
            else if (/^> (.+)/.test(line)) {
                this.renderBlockquote(line.slice(2));
            }
            else if (/^[\*\-] (.+)/.test(line)) {
                this.renderBullet(line.replace(/^[\*\-] /, ''));
            }
            else if (/^    [\*\-] (.+)/.test(line)) {
                this.renderBullet(line.replace(/^    [\*\-] /, ''), 5);
            }
            else if (/^\d+\. (.+)/.test(line)) {
                const num = Number(line.match(/^(\d+)\./)?.[1] ?? 1);
                this.renderNumbered(num, line.replace(/^\d+\. /, ''));
            }
            else if (line.trim() === '') {
                this.y += 2;
            }
            else {
                this.renderParagraph(parseInline(line));
            }
        }
    }
    renderDocHeader(title, subtitle) {
        this.doc.setFillColor(...BLUE);
        this.doc.rect(0, 0, this.pageW, 10, 'F');
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(255, 255, 255);
        this.doc.text('AI DENTAL EXAM ASSISTANT', this.pageW / 2, 6.5, { align: 'center' });
        this.y = 18;
        this.doc.setFontSize(18);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(...DARK);
        const titleLines = this.doc.splitTextToSize(title, this.maxW);
        for (const tl of titleLines) {
            this.doc.text(tl, this.marginL, this.y);
            this.y += 8;
        }
        if (subtitle) {
            this.doc.setFontSize(9);
            this.doc.setFont('helvetica', 'italic');
            this.doc.setTextColor(...MUTED);
            this.doc.text(subtitle, this.marginL, this.y);
            this.y += 5;
        }
        this.doc.setDrawColor(...BLUE);
        this.doc.setLineWidth(0.7);
        this.doc.line(this.marginL, this.y, this.marginL + this.maxW, this.y);
        this.y += 6;
        this.doc.setTextColor(...DARK);
    }
    addPageNumbers() {
        const total = this.doc.internal.getNumberOfPages();
        const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        for (let i = 1; i <= total; i++) {
            this.doc.setPage(i);
            this.doc.setFontSize(8);
            this.doc.setFont('helvetica', 'normal');
            this.doc.setTextColor(...MUTED);
            this.doc.text(date, this.marginL, this.pageH - 8);
            this.doc.text(`Page ${i} of ${total}`, this.pageW / 2, this.pageH - 8, { align: 'center' });
            this.doc.text('AI Dental Exam Assistant', this.pageW - this.marginR, this.pageH - 8, { align: 'right' });
        }
    }
    toBuffer() {
        return Buffer.from(this.doc.output('arraybuffer'));
    }
}
let PdfService = class PdfService {
    async generateContentPdf(title, content, subtitle = '') {
        const pdf = new PdfRenderer();
        pdf.renderDocHeader(title, subtitle);
        pdf.renderMarkdown(content);
        pdf.addPageNumbers();
        return pdf.toBuffer();
    }
    async generateVivaPdf(title, messages, subtitle = '') {
        const pdf = new PdfRenderer();
        pdf.renderDocHeader(title, subtitle);
        for (const msg of messages) {
            const isExaminer = msg.role === 'examiner';
            pdf.newPageIfNeeded(10);
            pdf.doc.setFontSize(9);
            pdf.doc.setFont('helvetica', 'bold');
            pdf.doc.setTextColor(...(isExaminer ? BLUE : DARK));
            pdf.doc.text(isExaminer ? '🎓 Examiner' : '👤 Student', pdf.marginL, pdf.y);
            pdf.y += 5;
            pdf.doc.setTextColor(...DARK);
            pdf.renderMarkdown(msg.text);
            pdf.y += 3;
        }
        pdf.addPageNumbers();
        return pdf.toBuffer();
    }
};
exports.PdfService = PdfService;
exports.PdfService = PdfService = __decorate([
    (0, common_1.Injectable)()
], PdfService);
//# sourceMappingURL=pdf.service.js.map