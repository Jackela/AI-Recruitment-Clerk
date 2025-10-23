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
    private readonly _configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        _configService.get<string>('JWT_SECRET') ||
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
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
