// src/admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getAllUsers() {
    return this.userRepository.find();
  }

  async deactivateUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { userID: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    user.role = 'inactive';
    await this.userRepository.save(user);
    return { message: 'User deactivated successfully' };
  }
}