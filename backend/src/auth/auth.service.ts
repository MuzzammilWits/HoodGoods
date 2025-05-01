// src/auth/auth.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { SupabaseService } from '../supabase.service'; 
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly supabaseService: SupabaseService
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

  async promoteUserToSeller(userInfo: any) {
    const userID = userInfo.sub;

    const user = await this.userRepository.findOne({ where: { userID } });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === 'seller') {
      return { message: 'User is already a seller' };
    }

    user.role = 'seller';
    await this.userRepository.save(user);

    return { message: 'User promoted to seller successfully' };
  }
  
  async getUserRole(userID: string) {
    const user = await this.userRepository.findOne({ where: { userID } });

    if (!user) {
      throw new Error('User not found');
    }

    return { role: user.role };
  }

  // New method to get all users
  async getAllUsers() {
    return this.userRepository.find({
      select: ['userID', 'role'] // Only return these fields
    });
  }
  async getUserById(userId: string) {
    return this.userRepository.findOne({ 
      where: { userID: userId },
      select: ['userID', 'role'] // Only return needed fields
    });
  }
  async getUserWithRole(userID: string) {
    const user = await this.userRepository.findOne({ 
      where: { userID },
      select: ['userID', 'role'] 
    });
  
    if (!user) {
      throw new Error('User not found');
    }
  
    return {
      userID: user.userID,
      role: user.role,
      isAdmin: user.role === 'admin'
    };
  }
  // New method to deactivate users
  async deactivateUser(userID: string) {
  console.log('Attempting to deactivate user:', userID);
  
  // Direct Supabase query without TypeORM
  const { data: user, error: findError } = await this.supabaseService.getClient()
    .from('Users')
    .select('*')
    .eq('userID', userID)
    .single();

  if (findError) throw new Error(`User lookup failed: ${findError.message}`);
  if (!user) throw new NotFoundException('User not found');

  console.log('Current user role:', user.role);
  
  if (user.role === 'inactive') {
    return { 
      success: false, 
      message: 'User already inactive',
      userID 
    };
  }

  // Direct update with Supabase
  const { data: updatedUser, error: updateError } = await this.supabaseService.getClient()
    .from('Users')
    .update({ role: 'inactive' })
    .eq('userID', userID)
    .select();

  if (updateError) throw new Error(`Update failed: ${updateError.message}`);

  console.log('Updated user:', updatedUser);
  
  return { 
    success: true,
    message: 'User deactivated',
    userID,
    role: 'inactive'
  };
}

}