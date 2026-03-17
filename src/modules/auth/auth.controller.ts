import { Controller, Post, Body, UnauthorizedException, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new student' })
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and receive JWT' })
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(
      body.email,
      body.password,
      body.role || 'STUDENT',
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials or role mismatch');
    }
    return this.authService.login(user);
  }
}
