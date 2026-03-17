import { Controller, Post, Body, UseGuards, Res } from '@nestjs/common';
import { GenerationService } from './generation/generation.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { Response } from 'express';

@ApiTags('RAG')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a response based on RAG context with streaming' })
  async generateStream(
    @Body('query') query: string,
    @Body('scope') scope: any,
    @Body('history') history: any[],
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = await this.generationService.generateResponse(query, scope, history);
      
      for await (const chunk of stream) {
        const content = chunk.text || '';
        if (content) {
          // Send using server-sent events format
          res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('Streaming error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to generate response' });
      } else {
        res.end();
      }
    }
  }
}
