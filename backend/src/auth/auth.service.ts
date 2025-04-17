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

  async saveUserToken(userInfo: any, token: string) {
    const auth0Id = userInfo.sub;
    const email = userInfo.email;
    const name = userInfo.name;

    let user = await this.userRepository.findOne({ where: { auth0Id } });

    if (!user) {
      user = this.userRepository.create({
        auth0Id,
        accessToken: token,
        email,
        name,
      });
    } else {
      user.accessToken = token; // Update token
      user.email = email ?? user.email; // Update email if available
      user.name = name ?? user.name;   // Update name if available
    }

    await this.userRepository.save(user);
    return { message: 'Token saved successfully' };
  }
}
