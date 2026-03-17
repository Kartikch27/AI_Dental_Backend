import { Controller, Post, Body, Get, Param, UseGuards, UseInterceptors, UploadedFile, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RagService } from './rag.service.js';
import { IngestionService } from './ingestion/ingestion.service.js';
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
    private readonly ingestionService: IngestionService
  ) {}

  @Post('ingest')
  @ApiOperation({ summary: 'Ingest a document into RAG (text)' })
  async ingest(@Body() body: { title: string, content: string, metadata: any }) {
    return this.ragService.ingestDocument(body.title, body.content, body.metadata || {});
  }

  @Post('ingest-file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Ingest a document into RAG (PDF)' })
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
  @ApiOperation({ summary: 'List all RAG documents' })
  async listDocuments() {
    // This would ideally be in a service, but for demo:
    return (this.ragService as any).prisma.ragDocument.findMany({
      include: { _count: { select: { chunks: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Get a specific RAG document' })
  async getDocumentById(@Param('id') id: string) {
    return this.ragService.getDocumentById(id);
  }

  @Get('documents/:id/chunks')
  @ApiOperation({ summary: 'Get chunks of a document' })
  async getChunks(@Param('id') id: string) {
    return (this.ragService as any).prisma.ragChunk.findMany({
      where: { documentId: id },
      orderBy: { chunkIndex: 'asc' }
    });
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete a document' })
  async deleteDocument(@Param('id') id: string) {
    return this.ragService.deleteDocument(id);
  }
}
