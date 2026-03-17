import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('PDF')
@Controller('pdf')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('export')
  @ApiOperation({ summary: 'Export content as PDF' })
  async export(@Body() body: { title: string, content: string }, @Res() res: Response) {
    const buffer = await this.pdfService.generateContentPdf(body.title, body.content);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=dental_study_material.pdf`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
