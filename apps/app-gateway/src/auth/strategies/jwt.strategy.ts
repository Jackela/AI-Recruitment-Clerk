import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import {
  JwtPayload,
  UserDto,
} from '@ai-recruitment-clerk/user-management-domain';

/**
 * Represents the jwt strategy.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Initializes a new instance of the Jwt Strategy.
   * @param authService - The auth service.
   * @param configService - The config service.
   */
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'ai-recruitment-secret-key-change-in-production',
      issuer: 'ai-recruitment-clerk',
      audience: 'ai-recruitment-users',
    });
  }

  /**
   * Validates the data.
   * @param payload - The payload.
   * @returns A promise that resolves to UserDto.
   */
  async validate(payload: JwtPayload): Promise<UserDto> {
    try {
      const user = await this.authService.validateJwtPayload(payload);
      if (!user) {
        throw new UnauthorizedException('Invalid token payload');
      }
      return user;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Token validation failed';
      throw new UnauthorizedException(message);
    }
  }
}
