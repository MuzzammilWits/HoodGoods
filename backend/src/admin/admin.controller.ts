// src/admin/admin.controller.ts
//import { Controller, Delete, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport'; // Assuming JWT guard

import {
    Controller, Post, Body, Get, UseGuards, Req,
    Param, Patch, Delete, ParseIntPipe, HttpCode, HttpStatus,
  } from '@nestjs/common';

interface RequestWithUser extends Request {
    user: {
      sub: string; // User ID from JWT subject
    };
  }

  @Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
async deleteProduct(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.adminService.deleteProduct(id);
  }
  }

