import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { NotesService } from './notes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Notes')
@ApiBearerAuth()
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  @ApiOperation({ summary: 'Generate new AI notes' })
  async generate(@Request() req: any, @Body() body: any) {
    return this.notesService.generateNotes(req.user.userId, body.nodeId, body.style);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  @ApiOperation({ summary: 'Get user note generation history' })
  async getHistory(@Request() req: any) {
    return this.notesService.getUserNotes(req.user.userId);
  }
}
