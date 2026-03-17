import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER } from '../ai/ai.provider.interface';
import type { AIProvider } from '../ai/ai.provider.interface';
import { RagService } from '../rag/rag.service';

@Injectable()
export class TestPapersService {
  constructor(
    private prisma: PrismaService,
    @Inject(AI_PROVIDER) private ai: AIProvider,
    private ragService: RagService,
  ) {}

  async generateTest(userId: string, nodeId: string, config: any) {
    const node = await this.prisma.syllabusNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new Error('Node not found');

    // Step 1: Retrieve RAG context (higher limit for test papers)
    const contextChunks = await this.ragService.retrieveContext(node.name, { nodeId }, 10);
    const contextText = contextChunks.map(c => c.content).join('\n\n');

    // Step 2: Build grounded prompt
    const prompt = `
      You are an expert dental examiner.
      Generate a test paper for the topic: ${node.name}.
      
      APPROVED CONTENT CONTEXT:
      ${contextText || 'Use general dental curriculum standards.'}
      
      CONFIGURATION:
      ${JSON.stringify(config)}
      
      STRUCTURE:
      Section A: MCQs (with options and answer key)
      Section B: Short Answer Questions (SAQs)
      Section C: Long Answer Questions (LAQs)
      Section D: Case-based Questions
      
      Ensure all questions are grounded in the provided context if available.
    `;

    // Step 3: Call LLM
    const content = await this.ai.generateText(prompt);

    // Step 4: Save output and sources
    const generation = await this.prisma.testPaperGeneration.create({
      data: {
        userId,
        nodeId,
        config,
        content,
      },
      include: { node: true }
    });

    if (contextChunks.length > 0) {
      // Note: Model name might be generationSource or GenerationSource in Prisma
      await (this.prisma as any).generationSource.createMany({
        data: contextChunks.map(chunk => ({
          userId,
          generationType: 'test_paper',
          generationId: generation.id,
          chunkId: chunk.id,
          relevanceScore: chunk.relevanceScore,
        }))
      });
    }

    return generation;
  }

  async getHistory(userId: string) {
    return this.prisma.testPaperGeneration.findMany({
      where: { userId },
      include: { node: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
