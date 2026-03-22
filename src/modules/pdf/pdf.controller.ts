import { Controller, Post, Body, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { PdfService, VivaMessage } from './pdf.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('PDF')
@Controller('pdf')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  /**
   * POST /api/v1/pdf/export
   *
   * Universal PDF export for all three content types.
   *
   * Body (notes / test-paper):
   * {
   *   "type": "notes" | "test-paper",   ← optional, defaults to "notes"
   *   "title": "Growth & Development",
   *   "subtitle": "DETAILED_EXPLANATION • BDS 3",  ← optional
   *   "content": "## Heading\n\nBody text with **bold** and *italic*..."
   * }
   *
   * Body (viva):
   * {
   *   "type": "viva",
   *   "title": "Viva Session – Malocclusion",
   *   "subtitle": "BDS 3 • Orthodontics",
   *   "messages": [
   *     { "role": "examiner", "text": "Define malocclusion." },
   *     { "role": "student",  "text": "Malocclusion is..." }
   *   ]
   * }
   */
  @Post('export')
  @ApiOperation({ summary: 'Export notes, test paper, or viva session as a formatted PDF' })
  async export(
    @Body() body: {
      type?: 'notes' | 'test-paper' | 'viva';
      title: string;
      subtitle?: string;
      content?: string;
      messages?: VivaMessage[];
    },
    @Res() res: Response,
  ) {
    const type     = body.type ?? 'notes';
    const title    = body.title    ?? 'Study Material';
    const subtitle = body.subtitle ?? '';

    let buffer: Buffer;
    let filename: string;

    if (type === 'viva') {
      if (!body.messages?.length) {
        throw new BadRequestException('messages[] is required for type "viva"');
      }
      buffer   = await this.pdfService.generateVivaPdf(title, body.messages, subtitle);
      filename = 'viva_session.pdf';
    } else {
      if (!body.content) {
        throw new BadRequestException('content is required for notes and test-paper exports');
      }
      buffer   = await this.pdfService.generateContentPdf(title, body.content, subtitle);
      filename = type === 'test-paper' ? 'test_paper.pdf' : 'study_notes.pdf';
    }

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      buffer.length,
    });

    res.end(buffer);
  }
}
