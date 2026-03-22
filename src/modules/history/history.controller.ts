import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('History')
@ApiBearerAuth()
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  /**
   * Returns all notes, test papers, and viva sessions for the logged-in user.
   * Use this to power the /previous-generation frontend route.
   *
   * Response shape:
   * {
   *   notes:       NoteGeneration[]        (with .node)
   *   testPapers:  TestPaperGeneration[]   (with .node)
   *   vivaSessions: VivaSession[]          (with .node and .messages)
   * }
   */
  @UseGuards(JwtAuthGuard)
  @Get('all')
  @ApiOperation({ summary: 'Get all generations (notes + test papers + viva) for the logged-in user' })
  async getAll(@Request() req: any) {
    return this.historyService.getAllGenerations(req.user.userId);
  }
}
