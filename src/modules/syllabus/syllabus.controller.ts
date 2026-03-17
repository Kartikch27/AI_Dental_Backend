import { Controller, Get, Param, Query } from '@nestjs/common';
import { SyllabusService } from './syllabus.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Syllabus')
@Controller('syllabus')
export class SyllabusController {
  constructor(private readonly syllabusService: SyllabusService) {}

  @Get('roots')
  @ApiOperation({ summary: 'Get root nodes (Years)' })
  async getRoots() {
    return this.syllabusService.getRoots();
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Get children of a node' })
  async getChildren(@Param('id') id: string) {
    return this.syllabusService.getChildren(id);
  }
}
