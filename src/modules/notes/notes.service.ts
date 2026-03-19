import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER } from '../ai/ai.provider.interface';
import type { AIProvider } from '../ai/ai.provider.interface';
import { GenerationType } from '@prisma/client';
import { RagService } from '../rag/rag.service';
import { SyllabusService } from '../syllabus/syllabus.service';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    @Inject(AI_PROVIDER) private ai: AIProvider,
    private ragService: RagService,
    private syllabusService: SyllabusService,
  ) {}

  async generateNotes(userId: string, nodeId: string, style: GenerationType) {
    const node = await this.prisma.syllabusNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new Error('Node not found');

    // Resolve full ancestor scope so retrieval filters on year/subject/chapter/concept
    const scope = await this.syllabusService.resolveAncestorScope(nodeId);

    // Step 1: Retrieve RAG context
    const maxSources = Number.parseInt(process.env.RAG_MAX_SOURCES || '4', 10);
    const maxSourceChars = Number.parseInt(process.env.RAG_SOURCE_MAX_CHARS || '900', 10);
    const maxContextChars = Number.parseInt(process.env.RAG_CONTEXT_MAX_CHARS || '3600', 10);

    const contextChunks = await this.ragService.retrieveContext(node.name, scope, maxSources);
    let used = 0;
    const parts: string[] = [];
    for (let i = 0; i < contextChunks.length; i++) {
      const raw = String(contextChunks[i].content || '');
      const clipped = raw.length > maxSourceChars ? raw.slice(0, maxSourceChars) : raw;
      const block = `[Source ${i + 1}]\n${clipped}`;
      if (used + block.length > maxContextChars) break;
      parts.push(block);
      used += block.length;
    }
    const contextText = parts.join('\n\n');

    // Step 2: Build grounded prompt
    const prompt = `
      You are an expert dental educator.
      Use the following approved educational context to generate ${style} for the topic: ${node.name}.
      
      CONTEXT:
      ${contextText || 'No specific context found. Use general dental knowledge.'}
      
      INSTRUCTION:
      Ensure clinical relevance and professional structure. 
      If context is provided, prioritize it.
    `;

    // Step 3: Call LLM
    const content = await this.ai.generateText(prompt);

    // Step 4: Save output and sources
    const generation = await this.prisma.noteGeneration.create({
      data: {
        userId,
        nodeId,
        style,
        content,
      },
      include: { node: true }
    });

    if (contextChunks.length > 0) {
      await (this.prisma as any).generationSource.createMany({
        data: contextChunks.map(chunk => ({
          userId,
          generationType: 'note',
          generationId: generation.id,
          chunkId: chunk.id,
          relevanceScore: chunk.relevanceScore,
        }))
      });
    }

    return generation;
  }

  async getUserNotes(userId: string) {
    return this.prisma.noteGeneration.findMany({
      where: { userId },
      include: { node: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
