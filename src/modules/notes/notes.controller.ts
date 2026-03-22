import { Controller, Post, Body, Get, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { NotesService } from './notes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { resolveGenerationType } from './generate-notes.dto';

@ApiTags('Notes')
@ApiBearerAuth()
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  @ApiOperation({ summary: 'Generate new AI notes' })
  async generate(@Request() req: any, @Body() body: any) {
    let style;
    try {
      style = resolveGenerationType(body.style);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
    return this.notesService.generateNotes(req.user.userId, body.nodeId, style);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  @ApiOperation({ summary: 'Get user note generation history' })
  async getHistory(@Request() req: any) {
    return this.notesService.getUserNotes(req.user.userId);
  }
}
