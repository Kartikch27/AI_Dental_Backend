import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER } from '../ai/ai.provider.interface';
import type { AIProvider } from '../ai/ai.provider.interface';
import { GenerationType } from '@prisma/client';
import { RagService } from '../rag/rag.service';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    @Inject(AI_PROVIDER) private ai: AIProvider,
    private ragService: RagService,
  ) {}

  async generateNotes(userId: string, nodeId: string, style: GenerationType) {
    const node = await this.prisma.syllabusNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new Error('Node not found');

    // Step 1: Retrieve RAG context
    const contextChunks = await this.ragService.retrieveContext(node.name, { nodeId });
    const contextText = contextChunks.map(c => c.content).join('\n\n');

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
