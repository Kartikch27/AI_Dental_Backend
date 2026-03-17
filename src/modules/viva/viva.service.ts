import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER } from '../ai/ai.provider.interface';
import type { AIProvider } from '../ai/ai.provider.interface';
import { RagService } from '../rag/rag.service';

@Injectable()
export class VivaService {
  constructor(
    private prisma: PrismaService,
    @Inject(AI_PROVIDER) private ai: AIProvider,
    private ragService: RagService,
  ) {}

  async startSession(userId: string, nodeId: string) {
    const node = await this.prisma.syllabusNode.findUnique({ where: { id: nodeId } });
    if (!node) throw new Error('Node not found');

    const session = await this.prisma.vivaSession.create({
      data: {
        userId,
        nodeId,
        status: 'active',
      }
    });

    // Step 1: Retrieve RAG context for initial question
    const contextChunks = await this.ragService.retrieveContext(`Introduction and basic questions about ${node.name}`, { nodeId });
    const contextText = contextChunks.map(c => c.content).join('\n\n');

    // Step 2: Generate first question grounded in RAG
    const prompt = `
      You are a strict but fair dental examiner.
      Start a viva session for the topic: ${node.name}.
      
      APPROVED CONTENT CONTEXT:
      ${contextText || 'Use standard dental curriculum.'}
      
      INSTRUCTION:
      Welcome the student and ask the first examiner question. 
      Ensure the question is grounded in the provided context if available.
    `;
    const greeting = await this.ai.generateText(prompt);
    
    await this.prisma.vivaMessage.create({
      data: {
        sessionId: session.id,
        role: 'examiner',
        text: greeting,
      }
    });

    // Step 3: Track sources for this turn
    if (contextChunks.length > 0) {
      await (this.prisma as any).generationSource.createMany({
        data: contextChunks.map(chunk => ({
          userId,
          generationType: 'viva',
          generationId: session.id,
          chunkId: chunk.id,
          relevanceScore: chunk.relevanceScore,
        }))
      });
    }

    return { session, firstQuestion: greeting };
  }

  async processAnswer(sessionId: string, answer: string) {
    const session = await this.prisma.vivaSession.findUnique({
      where: { id: sessionId },
      include: { node: true, messages: true }
    });
    if (!session) throw new Error('Session not found');

    // Save student answer
    await this.prisma.vivaMessage.create({
      data: {
        sessionId: session.id,
        role: 'student',
        text: answer,
      }
    });

    // Step 1: Retrieve context for the current answer/state
    const contextChunks = await this.ragService.retrieveContext(`${session.node.name}: ${answer}`, { nodeId: session.nodeId });
    const contextText = contextChunks.map(c => c.content).join('\n\n');

    // Step 2: Evaluate and get next question
    const prompt = `
      You are a dental examiner.
      Topic: ${session.node.name}.
      
      APPROVED CONTENT CONTEXT:
      ${contextText || 'Use standard dental curriculum.'}
      
      STUDENT ANSWER:
      "${answer}"
      
      CONVERSATION HISTORY:
      ${session.messages.slice(-4).map(m => `${m.role}: ${m.text}`).join('\n')}
      
      INSTRUCTION:
      Evaluate the student's answer. If incorrect, provide brief feedback. 
      Then ask the next relevant viva question. Keep the flow natural.
      Ground your evaluation and next question in the approved context.
    `;
    const aiResponse = await this.ai.generateText(prompt);

    // Save examiner response
    const examinerMsg = await this.prisma.vivaMessage.create({
      data: {
        sessionId: session.id,
        role: 'examiner',
        text: aiResponse,
      }
    });

    // Step 3: Track sources for this turn
    if (contextChunks.length > 0) {
      await (this.prisma as any).generationSource.createMany({
        data: contextChunks.map(chunk => ({
          userId: session.userId,
          generationType: 'viva_turn',
          generationId: examinerMsg.id,
          chunkId: chunk.id,
          relevanceScore: chunk.relevanceScore,
        }))
      });
    }

    return aiResponse;
  }

  async getSessionHistory(sessionId: string) {
    return this.prisma.vivaMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
