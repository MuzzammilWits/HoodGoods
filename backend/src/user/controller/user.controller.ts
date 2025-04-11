// src/user/user.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserService } from '../service/user.service';

@Controller('users') // what ever the end point is, it is relative to what is defined in these brackets
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body('name') name: string) {
    return this.userService.createUser(name);
  }

  @Get()
  async findAll() {
    return this.userService.getAllUsers();
  }
}
