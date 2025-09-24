import { Injectable, UnauthorizedException } from '@nestjs/common';
// Avoid extending PassportStrategy mixin to prevent CJS transpile issues
// import { PassportStrategy } from '@nestjs/passport';
// import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { UserDto } from '@ai-recruitment-clerk/user-management-domain';

@Injectable()
export class LocalStrategy {
  constructor(private readonly authService: AuthService) {}

  async validate(email: string, password: string): Promise<UserDto> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
