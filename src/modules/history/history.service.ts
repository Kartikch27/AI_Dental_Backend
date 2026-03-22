import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async getAllGenerations(userId: string) {
    const [notes, testPapers, vivaSessions] = await Promise.all([
      this.prisma.noteGeneration.findMany({
        where: { userId },
        include: { node: true },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.testPaperGeneration.findMany({
        where: { userId },
        include: { node: true },
        orderBy: { createdAt: 'desc' },
      }),

      this.prisma.vivaSession.findMany({
        where: { userId },
        include: {
          node: true,
          messages: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { notes, testPapers, vivaSessions };
  }
}
