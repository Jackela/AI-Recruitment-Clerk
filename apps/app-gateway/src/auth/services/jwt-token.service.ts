import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  AuthResponseDto,
  JwtPayload,
  UserDto,
  UserStatus,
} from '@ai-recruitment-clerk/user-management-domain';
import { UserService } from '../user.service';
import { RedisTokenBlacklistService } from '../../security/redis-token-blacklist.service';

/**
 * Service for JWT token operations including generation, validation, and refresh.
 * Extracted from AuthService to follow Single Responsibility Principle.
 */
@Injectable()
export class JwtTokenService {
  private readonly logger = new Logger(JwtTokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly tokenBlacklistService: RedisTokenBlacklistService,
  ) {}

  /**
   * Validates JWT payload and returns the associated user.
   * @param payload - The JWT payload.
   * @param token - The optional JWT token for blacklist checking.
   * @returns A promise that resolves to UserDto.
   */
  async validateJwtPayload(
    payload: JwtPayload,
    token?: string,
  ): Promise<UserDto> {
    // Check if token is blacklisted using Redis-based service
    if (token && (await this.tokenBlacklistService.isBlacklisted(token))) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Check if all user tokens are blacklisted (security breach response)
    if (
      payload.sub &&
      (await this.tokenBlacklistService.isUserBlacklisted(payload.sub))
    ) {
      throw new UnauthorizedException('All user tokens have been revoked');
    }

    // Enhanced payload validation
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Check token age (prevent very old tokens)
    if (payload.iat && Date.now() - payload.iat * 1000 > 24 * 60 * 60 * 1000) {
      throw new UnauthorizedException('Token too old');
    }

    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status && user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active');
    }

    // Verify organization consistency
    if (
      payload.organizationId &&
      user.organizationId &&
      payload.organizationId !== user.organizationId
    ) {
      throw new UnauthorizedException('Organization mismatch');
    }

    return user;
  }

  /**
   * Refreshes JWT tokens using a refresh token.
   * @param refreshToken - The refresh token.
   * @returns A promise that resolves to AuthResponseDto.
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      // Validate refresh token format
      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new UnauthorizedException('Invalid refresh token format');
      }

      // Check if refresh token is blacklisted using Redis-based service
      if (await this.tokenBlacklistService.isBlacklisted(refreshToken)) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'ai-recruitment-refresh-secret',
      });

      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokenExpiry =
        typeof payload.exp === 'number'
          ? payload.exp
          : Math.floor(Date.now() / 1000) + 60;

      let user = await this.userService.findById(payload.sub);
      if (!user && payload.email) {
        user = await this.userService.findByEmail(payload.email);
      }

      if (!user) {
        user = {
          id: payload.sub,
          email: payload.email ?? '',
          role: payload.role,
          organizationId: payload.organizationId,
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
        } as UserDto;
      }

      if (!user || (user.status && user.status !== UserStatus.ACTIVE)) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Blacklist the old refresh token to prevent reuse using Redis service
      await this.tokenBlacklistService.blacklistToken(
        refreshToken,
        payload.sub,
        tokenExpiry,
        'token_refresh',
      );

      return this.generateAuthResponse(user);
    } catch (error) {
      this.logger.warn(
        `Refresh token validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Generates authentication response with access and refresh tokens.
   * @param user - The user to generate tokens for.
   * @returns A promise that resolves to AuthResponseDto.
   */
  async generateAuthResponse(user: UserDto): Promise<AuthResponseDto> {
    const now = Math.floor(Date.now() / 1000);
    const responseUser = this.prepareUserForResponse(user);
    const normalizedRole = this.normalizeRole(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: normalizedRole ?? user.role,
      organizationId: user.organizationId,
      iat: now,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(
      {
        ...payload,
        tokenType: 'refresh',
      },
      {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'ai-recruitment-refresh-secret',
        expiresIn:
          this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );

    const expiresIn = parseInt(
      this.configService.get<string>('JWT_EXPIRES_IN_SECONDS') || '900',
    );

    return {
      accessToken,
      refreshToken,
      user: responseUser,
      expiresIn,
    };
  }

  /**
   * Normalizes user role to lowercase string.
   * @param user - The user.
   * @returns Normalized role string or undefined.
   */
  normalizeRole(user: UserDto): string | undefined {
    const rawRole =
      (user as any)?.rawRole !== undefined
        ? (user as any).rawRole
        : user.role;

    if (typeof rawRole === 'string') {
      return rawRole.toLowerCase();
    }

    return rawRole;
  }

  /**
   * Prepares user object for API response by removing sensitive data.
   * @param user - The user.
   * @returns Sanitized user object.
   */
  prepareUserForResponse(user: UserDto): UserDto {
    const normalizedRole = this.normalizeRole(user);
    const safeUser: UserDto = {
      id: user.id,
      email: user.email,
      username: (user as any)?.username,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      role: normalizedRole ?? user.role,
      organizationId: user.organizationId,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.isActive,
    };

    return safeUser;
  }

  /**
   * Decodes a JWT token without validation.
   * @param token - The token to decode.
   * @returns The decoded payload or null.
   */
  decodeToken(token: string): any {
    return typeof this.jwtService.decode === 'function'
      ? this.jwtService.decode(token)
      : null;
  }
}
