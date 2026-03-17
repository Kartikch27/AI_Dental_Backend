import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SyllabusNode, NodeType } from '@prisma/client';

@Injectable()
export class SyllabusService {
  constructor(private prisma: PrismaService) {}

  async getRoots() {
    return this.prisma.syllabusNode.findMany({
      where: { parentId: null },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async getChildren(parentId: string) {
    return this.prisma.syllabusNode.findMany({
      where: { parentId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async getNodeById(id: string) {
    return this.prisma.syllabusNode.findUnique({
      where: { id },
    });
  }

  async createNode(data: { name: string, type: NodeType, parentId?: string, orderIndex?: number }) {
    return this.prisma.syllabusNode.create({
      data,
    });
  }
}
