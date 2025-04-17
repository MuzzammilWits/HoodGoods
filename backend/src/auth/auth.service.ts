// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async saveUserInfo(userInfo: any) {
    const userID = userInfo.sub;

    let user = await this.userRepository.findOne({ where: { userID } });

    if (!user) {
      user = this.userRepository.create({
        userID,
        role: 'buyer',
      });
      await this.userRepository.save(user);
    }

    return { message: 'User registered or already exists' };
  }
}
