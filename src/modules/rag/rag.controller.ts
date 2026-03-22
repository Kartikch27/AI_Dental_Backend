import { Controller, Post, Get, Body, Query, UseGuards, Res } from '@nestjs/common';
import { GenerationService } from './generation/generation.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PrismaService } from '../../prisma/prisma.service';
import type { Response } from 'express';

@ApiTags('RAG Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rag')
export class RagController {
  constructor(
    private readonly generationService: GenerationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /rag/generate  — Server-Sent Events (streaming)
   *
   * Body: { query: string, scope?: { yearId, subjectId, chapterId, conceptId }, history?: [] }
   *
   * SSE format:
   *   data: {"text":"chunk…"}\n\n
   *   data: [DONE]\n\n
   */
  @Post('generate')
  @ApiOperation({ summary: 'Streaming RAG chat (SSE)' })
  async generateStream(
    @Body('query')   query:   string,
    @Body('scope')   scope:   any,
    @Body('history') history: any[],
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');

    try {
      const stream = await this.generationService.generateResponse(query, scope ?? {}, history ?? []);

      for await (const chunk of stream) {
        const content = (chunk as any).text || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      console.error('Streaming error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate response' });
      } else {
        res.end();
      }
    }
  }

  /**
   * POST /rag/chat  — JSON (non-streaming, easier to use in Next.js)
   *
   * Body: { query: string, scope?: { yearId, subjectId, chapterId, conceptId }, history?: [] }
   *
   * Response: { answer: string, sources: [...] }
   */
  @Post('chat')
  @ApiOperation({ summary: 'Non-streaming RAG chat (JSON response)' })
  async chat(
    @Body('query')   query:   string,
    @Body('scope')   scope:   any,
    @Body('history') history: any[],
  ) {
    return this.generationService.chat(query, scope ?? {}, history ?? []);
  }

  /**
   * GET /rag/scope-info?yearId=&subjectId=&chapterId=
   *
   * Returns human-readable labels for the current scope so the frontend
   * can show a breadcrumb like: "BDS 1 → Orthodontics → Growth & Development"
   *
   * Response: { year, subject, chapter, concept } — null if id not provided
   */
  @Get('scope-info')
  @ApiOperation({ summary: 'Resolve scope IDs to human-readable names' })
  async scopeInfo(
    @Query('yearId')    yearId?:    string,
    @Query('subjectId') subjectId?: string,
    @Query('chapterId') chapterId?: string,
    @Query('conceptId') conceptId?: string,
  ) {
    const ids = [yearId, subjectId, chapterId, conceptId].filter(Boolean) as string[];
    if (!ids.length) return { year: null, subject: null, chapter: null, concept: null };

    const nodes = await this.prisma.syllabusNode.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, type: true },
    });

    const byId = new Map(nodes.map(n => [n.id, n]));

    return {
      year:    yearId    ? (byId.get(yearId)    ?? null) : null,
      subject: subjectId ? (byId.get(subjectId) ?? null) : null,
      chapter: chapterId ? (byId.get(chapterId) ?? null) : null,
      concept: conceptId ? (byId.get(conceptId) ?? null) : null,
    };
  }
}
