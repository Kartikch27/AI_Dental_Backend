import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NodeType } from '@prisma/client';

export interface AncestorScope {
  nodeId: string;
  yearId?: string;
  subjectId?: string;
  chapterId?: string;
  conceptId?: string;
}

export interface SyllabusNodeWithPath {
  id: string;
  name: string;
  type: NodeType;
  parentId: string | null;
  orderIndex: number;
  path: Array<{ id: string; name: string; type: NodeType }>;
}

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

  async createNode(data: {
    name: string;
    type: NodeType;
    parentId?: string;
    orderIndex?: number;
  }) {
    return this.prisma.syllabusNode.create({ data });
  }

  /**
   * Given any nodeId, walks up the SyllabusNode tree and returns
   * the full ancestor scope (yearId, subjectId, chapterId, conceptId).
   * This is used to populate RagChunk scope fields during ingestion and
   * to build retrieval scopes during generation.
   */
  async resolveAncestorScope(nodeId: string): Promise<AncestorScope> {
    // Walk up the tree collecting all ancestors in a single traversal.
    const scope: AncestorScope = { nodeId };

    let current = await this.prisma.syllabusNode.findUnique({
      where: { id: nodeId },
    });

    while (current) {
      switch (current.type) {
        case NodeType.YEAR:
          scope.yearId = current.id;
          break;
        case NodeType.SUBJECT:
          scope.subjectId = current.id;
          break;
        case NodeType.CHAPTER:
          scope.chapterId = current.id;
          break;
        case NodeType.CONCEPT:
          scope.conceptId = current.id;
          break;
      }

      if (!current.parentId) break;
      current = await this.prisma.syllabusNode.findUnique({
        where: { id: current.parentId },
      });
    }

    return scope;
  }

  /**
   * Returns the breadcrumb path from root → nodeId as an ordered array.
   */
  async getNodePath(nodeId: string): Promise<SyllabusNodeWithPath> {
    const target = await this.prisma.syllabusNode.findUnique({
      where: { id: nodeId },
    });
    if (!target) throw new Error(`SyllabusNode ${nodeId} not found`);

    const path: Array<{ id: string; name: string; type: NodeType }> = [];
    let current: typeof target | null = target;

    while (current) {
      path.unshift({ id: current.id, name: current.name, type: current.type });
      if (!current.parentId) break;
      current = await this.prisma.syllabusNode.findUnique({
        where: { id: current.parentId },
      });
    }

    return { ...target, path };
  }

  /**
   * Returns the full syllabus tree rooted at the given nodeId (or all roots if omitted).
   */
  async getFullTree(
    rootId?: string,
  ): Promise<any[]> {
    const roots = rootId
      ? await this.prisma.syllabusNode.findMany({
          where: { id: rootId },
          orderBy: { orderIndex: 'asc' },
        })
      : await this.prisma.syllabusNode.findMany({
          where: { parentId: null },
          orderBy: { orderIndex: 'asc' },
        });

    return this.attachChildren(roots);
  }

  private async attachChildren(nodes: any[]): Promise<any[]> {
    return Promise.all(
      nodes.map(async (node) => {
        const children = await this.prisma.syllabusNode.findMany({
          where: { parentId: node.id },
          orderBy: { orderIndex: 'asc' },
        });
        return {
          ...node,
          children: children.length ? await this.attachChildren(children) : [],
        };
      }),
    );
  }
}
