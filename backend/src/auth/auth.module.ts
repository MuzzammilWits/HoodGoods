// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { AdminController } from './admin.controller';//for admin delete orders
import { SupabaseService } from 'src/supabase.service';
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [JwtStrategy, AuthService,SupabaseService],
  controllers: [AuthController, AdminController],
  exports: [PassportModule],
})
export class AuthModule {}
