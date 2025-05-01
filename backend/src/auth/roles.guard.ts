// src/auth/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'role',
      context.getHandler(),
    );
    
    console.log('Required roles:', requiredRoles); // Debug log
    
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    console.log('User making request:', user); // Debug log
    
    const hasRole = requiredRoles.includes(user.role);
    
    if (!hasRole) {
      console.warn('Role check failed. User role:', user.role, 'Required:', requiredRoles);
    }
    
    return hasRole;
  }
}