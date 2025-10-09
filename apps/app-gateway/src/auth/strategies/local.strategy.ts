import { Injectable, UnauthorizedException } from '@nestjs/common';
// Avoid extending PassportStrategy mixin to prevent CJS transpile issues
// import { PassportStrategy } from '@nestjs/passport';
// import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { UserDto } from '@ai-recruitment-clerk/user-management-domain';

/**
 * Represents the local strategy.
 */
@Injectable()
export class LocalStrategy {
  /**
   * Initializes a new instance of the Local Strategy.
   * @param authService - The auth service.
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * Validates the data.
   * @param email - The email.
   * @param password - The password.
   * @returns A promise that resolves to UserDto.
   */
  async validate(email: string, password: string): Promise<UserDto> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
