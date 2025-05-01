// src/auth/admin.controller.ts
import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { AuthService } from './auth.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly authService: AuthService) {}

  @Get('users')
  @Roles('admin')
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Post('deactivate/:userID')
  @Roles('admin')
  async deactivateUser(@Param('userID') userId: string) {
    console.log('Deactivation request for user:', userId); // Debug log
    try {
      const result = await this.authService.deactivateUser(userId);
      console.log('Deactivation result:', result); // Debug log
      return result;
    } catch (error) {
      console.error('Deactivation error:', error);
      throw error;
    }
  }
}