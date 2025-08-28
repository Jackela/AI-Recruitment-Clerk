import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { JwtPayload, UserDto } from '@app/shared-dtos';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'ai-recruitment-secret-key-change-in-production',
      issuer: 'ai-recruitment-clerk',
      audience: 'ai-recruitment-users'
    });
  }

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