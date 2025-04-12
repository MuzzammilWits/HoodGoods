import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Controller()
export class AppController {
  @Get('protected')
  @UseGuards(JwtAuthGuard)
  getProtected() {
    return { message: 'This is a protected route!' };
  }
}
