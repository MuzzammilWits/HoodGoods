// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../repository/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createUser(name: string): Promise<User> {
    const user = this.userRepo.create({ name });
    return await this.userRepo.save(user);
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepo.find();
  }
}
