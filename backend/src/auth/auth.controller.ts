// src/auth/auth.controller.ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('save-token')
  async saveToken(@Req() req: any, @Body('token') token: string) {
    const userInfo = req.user; // Comes from JWT payload
    console.log('User info from token:', userInfo);
    return this.authService.saveUserToken(userInfo, token);
  }
}
