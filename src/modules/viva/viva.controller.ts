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
    const response = await this.vivaService.processAnswer(body.sessionId, body.answer);
    return { response };
  }

  @UseGuards(JwtAuthGuard)
  @Get('session/:id')
  @ApiOperation({ summary: 'Get session message history' })
  async getHistory(@Param('id') id: string) {
    return this.vivaService.getSessionHistory(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  @ApiOperation({ summary: 'Get all viva sessions for the logged-in user' })
  async getUserSessions(@Request() req: any) {
    return this.vivaService.getUserSessions(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('end')
  @ApiOperation({ summary: 'End / close a viva session' })
  async endSession(@Body() body: any) {
    return this.vivaService.endSession(body.sessionId);
  }
}
