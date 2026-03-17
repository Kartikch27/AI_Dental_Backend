import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { TestPapersService } from './test-papers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Test Papers')
@ApiBearerAuth()
@Controller('test-papers')
export class TestPapersController {
  constructor(private readonly testPapersService: TestPapersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  @ApiOperation({ summary: 'Generate new AI test paper' })
  async generate(@Request() req: any, @Body() body: any) {
    return this.testPapersService.generateTest(req.user.userId, body.nodeId, body.config);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  @ApiOperation({ summary: 'Get user test paper history' })
  async getHistory(@Request() req: any) {
    return this.testPapersService.getHistory(req.user.userId);
  }
}
