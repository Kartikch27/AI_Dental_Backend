import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SyllabusService } from './syllabus.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NodeType } from '@prisma/client';

@ApiTags('Syllabus')
@Controller('syllabus')
export class SyllabusController {
  constructor(private readonly syllabusService: SyllabusService) {}

  @Get('roots')
  @ApiOperation({ summary: 'Get root nodes (Years)' })
  async getRoots() {
    return this.syllabusService.getRoots();
  }

  /** Full nested tree from all roots (or a specific root) */
  @Get('tree')
  @ApiOperation({ summary: 'Get the full syllabus tree (nested)' })
  async getFullTree() {
    return this.syllabusService.getFullTree();
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get direct children of a node' })
  async getChildren(@Param('id') id: string) {
    return this.syllabusService.getChildren(id);
  }

  /** Returns breadcrumb path + resolved ancestor IDs (yearId, subjectId…) for any nodeId */
  @Get(':id/path')
  @ApiOperation({ summary: 'Get breadcrumb path and ancestor scope for a node' })
  async getNodePath(@Param('id') id: string) {
    const nodePath = await this.syllabusService.getNodePath(id);
    const scope = await this.syllabusService.resolveAncestorScope(id);
    return { ...nodePath, scope };
  }

  /** Create a new node (year / subject / chapter / concept) */
  @Post()
  @ApiOperation({ summary: 'Create a new syllabus node' })
  async createNode(
    @Body()
    body: {
      name: string;
      type: NodeType;
      parentId?: string;
      orderIndex?: number;
    },
  ) {
    return this.syllabusService.createNode(body);
  }
}
