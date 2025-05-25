// backend/src/auth/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service'; 
import { ROLES_KEY } from './roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // This ensures routes without specific role requirements are not blocked by this guard.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; 

    if (!user || !user.sub) {
      // This case should ideally be caught by JwtAuthGuard first,
      throw new UnauthorizedException('User not authenticated or user ID missing.');
    }

    // Fetch the user's current role from the database via AuthService
    const userRoleData = await this.authService.getUserRole(user.sub);

    if (!userRoleData || !userRoleData.role) {
      // This might happen if the user exists in Auth0 but not in your local DB,
      throw new ForbiddenException('Could not determine user role from the database.');
    }

    const hasRequiredRole = requiredRoles.some((role) => userRoleData.role === role);

    if (!hasRequiredRole) {
      throw new ForbiddenException(`User role '${userRoleData.role}' is not authorized to access this resource. Required roles: ${requiredRoles.join(', ')}.`);
    }

    return true;
  }
}