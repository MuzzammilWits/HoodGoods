// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { SupabaseService } from '../supabase.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private supabaseService: SupabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: 'https://hoodgoods-api.com',
      issuer: 'https://dev-vp08yyf1exxzeenl.us.auth0.com/',
      algorithms: ['RS256'],
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://dev-vp08yyf1exxzeenl.us.auth0.com/.well-known/jwks.json',
      }),
    });
  }

  async validate(payload: any) {
    // console.log('JWT payload:', payload); // Debug log
    
    try {
      const { data: user, error } = await this.supabaseService.getClient()
        .from('Users')
        .select('role')
        .eq('userID', payload.sub)
        .single();
  
      console.log('Supabase query results:', { data: user, error }); // Debug log
  
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }
  
      if (!user) {
        console.error('User not found in database for sub:', payload.sub);
        throw new Error('User not found in database');
      }
  
      return {
        sub: payload.sub,
        userId: payload.sub,
        role: user.role
      };
    } catch (error) {
      console.error('Validation error:', error);
      throw error;
    }
  }
}