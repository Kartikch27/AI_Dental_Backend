import { Controller, Post, Body, Get, Param, UseGuards, Request } from '@nestjs/common';
import { VivaService } from './viva.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Viva Simulator')
@ApiBearerAuth()
@Controller('viva')
export class VivaController {
  constructor(private readonly vivaService: VivaService) {}

  @UseGuards(JwtAuthGuard)
  @Post('start')
  @ApiOperation({ summary: 'Start a new viva session' })
  async start(@Request() req: any, @Body() body: any) {
    return this.vivaService.startSession(req.user.userId, body.nodeId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('answer')
  @ApiOperation({ summary: 'Submit an answer and get next response' })
  async answer(@Body() body: any) {
    return this.vivaService.processAnswer(body.sessionId, body.answer);
  }

  @UseGuards(JwtAuthGuard)
  @Get('session/:id')
  @ApiOperation({ summary: 'Get session message history' })
  async getHistory(@Param('id') id: string) {
    return this.vivaService.getSessionHistory(id);
  }
}
