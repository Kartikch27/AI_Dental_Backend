import {
  Controller, Post, Body, Get, Param, UseGuards,
  UseInterceptors, UploadedFile, Delete, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RagService } from './rag.service.js';
import { IngestionService } from './ingestion/ingestion.service.js';
import { ChapterDetectionService } from './ingestion/chapter-detection.service.js';
import { PdfRendererService } from './ingestion/pdf-renderer.service.js';
import { TocVisionService } from './ingestion/toc-vision.service.js';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '@prisma/client';

@ApiTags('Admin RAG')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/rag')
export class RagAdminController {
  constructor(
    private readonly ragService: RagService,
    private readonly ingestionService: IngestionService,
    private readonly chapterDetectionService: ChapterDetectionService,
    private readonly pdfRenderer: PdfRendererService,
    private readonly tocVision: TocVisionService,
  ) {}

  /**
   * Dry-run: upload a PDF and preview the chapters that would be detected,
   * WITHOUT actually ingesting anything. Use this before ingest-file to
   * confirm the chapter structure looks correct.
   *
   * Form fields: file (PDF), parentNodeId (optional)
   */
  @Post('preview-chapters')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Preview auto-detected chapters in a PDF (dry run, no ingestion)' })
  async previewChapters(@UploadedFile() file: any) {
    if (!file?.buffer) throw new BadRequestException('No file uploaded');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: file.buffer });
    const pdfData = await parser.getText();
    await parser.destroy();

    const rawText: string = pdfData.text;
    const pageCountMatch = rawText.match(/--\s*\d+\s*of\s*(\d+)\s*--/);
    const pageCount = pageCountMatch ? parseInt(pageCountMatch[1], 10) : 1;
    const isScanned = this.pdfRenderer.isScannedPdf(rawText, pageCount);

    // Scanned PDF → Claude Vision reads the ToC pages as images
    if (isScanned && this.tocVision.isAvailable) {
      const tocPages = await this.pdfRenderer.findTocPages(file.buffer);
      const tocImages = await this.pdfRenderer.renderPages(file.buffer, tocPages, 1.8);
      const tocResult = await this.tocVision.extractToc(tocImages);

      if (tocResult && tocResult.allChapters.length >= 2) {
        return {
          strategy: 'claude_vision_toc',
          pdfType: 'scanned',
          pageCount,
          tocPagesUsed: tocPages,
          sectionCount: tocResult.sections.length,
          chapterCount: tocResult.allChapters.length,
          sections: tocResult.sections.map((s) => ({
            title: s.title,
            chapters: s.chapters.map((c) => ({
              number: c.number,
              title: c.title,
              page: c.page,
            })),
          })),
        };
      }
    }

    // Text PDF (or scanned without Vision key) → pattern-based detection
    const detection = this.chapterDetectionService.detect(rawText);
    return {
      strategy: detection.strategy,
      pdfType: isScanned ? 'scanned_no_vision_key' : 'text',
      pageCount,
      totalCharsDetected: detection.totalChars,
      chapterCount: detection.chapters.length,
      chapters: detection.chapters.map((c) => ({
        index: c.index,
        title: c.title,
        headingRaw: c.headingRaw,
        contentChars: c.content.length,
        contentPreview: c.content.slice(0, 200).replace(/\n/g, ' ') + '...',
      })),
    };
  }

  /**
   * Debug: returns raw extracted text from the PDF so you can see exactly
   * what pdf-parse produces. Use this to tune chapter detection patterns.
   */
  @Post('debug-pdf-text')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Debug: inspect raw extracted PDF text (no ingestion)' })
  async debugPdfText(@UploadedFile() file: any) {
    if (!file?.buffer) throw new BadRequestException('No file uploaded');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: file.buffer });
    const pdfData = await parser.getText();
    await parser.destroy();

    const text: string = pdfData.text;
    const lines = text.split('\n');

    return {
      totalChars: text.length,
      totalLines: lines.length,
      // First 100 lines as JSON-escaped strings so whitespace is visible
      first100Lines: lines
        .slice(0, 100)
        .map((l, i) => `${String(i + 1).padStart(3)}: ${JSON.stringify(l)}`),
      // Raw first 4000 chars (covers ToC area in most books)
      rawFirst4000: text.slice(0, 4000),
    };
  }

  /**
   * Ingest a plain-text document. Pass nodeId in metadata to enable
   * chapter-aware ingestion.
   *
   * Body: { title, content, metadata: { nodeId, sourceType, autoDetectChapters? } }
   */
  @Post('ingest')
  @ApiOperation({ summary: 'Ingest a text document into RAG' })
  async ingest(@Body() body: { title: string; content: string; metadata: any }) {
    return this.ragService.ingestDocument(body.title, body.content, body.metadata || {});
  }

  /**
   * Ingest a PDF. Automatically detects and splits by chapters.
   *
   * Form fields:
   *   - file        – PDF file
   *   - title       – display name
   *   - metadata    – JSON string: { nodeId, sourceType, autoDetectChapters? }
   *
   * If metadata.nodeId is provided, each detected chapter gets its own
   * SyllabusNode created under that parent and all chunks are tagged with
   * the full ancestor scope (yearId, subjectId, chapterId, conceptId).
   */
  @Post('ingest-file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Ingest a PDF into RAG with auto chapter detection' })
  async ingestFile(
    @UploadedFile() file: any,
    @Body('title') title: string,
    @Body('metadata') metadataStr: string,
  ) {
    const metadata = metadataStr ? JSON.parse(metadataStr) : {};
    return this.ragService.ingestFile(title, file, metadata);
  }

  @Post('documents/:id/retry')
  @ApiOperation({ summary: 'Retry a failed ingestion' })
  async retryIngestion(@Param('id') id: string) {
    return this.ingestionService.retryIngestion(id);
  }

  @Get('documents')
  @ApiOperation({ summary: 'List all RAG documents with chunk counts' })
  async listDocuments() {
    return (this.ragService as any).prisma.ragDocument.findMany({
      include: {
        _count: { select: { chunks: true } },
        node: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get a specific RAG document' })
  async getDocumentById(@Param('id') id: string) {
    return this.ragService.getDocumentById(id);
  }

  @Get('documents/:id/chunks')
  @ApiOperation({ summary: 'Get chunks of a document with their scope labels' })
  async getChunks(@Param('id') id: string) {
    return (this.ragService as any).prisma.ragChunk.findMany({
      where: { documentId: id },
      select: {
        id: true,
        chunkIndex: true,
        sectionTitle: true,
        tokenCount: true,
        nodeId: true,
        yearId: true,
        subjectId: true,
        chapterId: true,
        conceptId: true,
        content: true,
      },
      orderBy: { chunkIndex: 'asc' },
    });
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document and all its chunks' })
  async deleteDocument(@Param('id') id: string) {
    return this.ragService.deleteDocument(id);
  }
}
