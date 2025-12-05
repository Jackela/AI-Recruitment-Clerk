import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MfaController } from './controllers/mfa.controller';
import { UsersController } from './users.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UserService } from './user.service';
import { MfaService } from './services/mfa.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { UserProfile, UserProfileSchema } from '../schemas/user-profile.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SecurityModule } from '../security/security.module';

// Extracted AuthService services (SRP refactoring)
import { JwtTokenService } from './services/jwt-token.service';
import { PasswordService } from './services/password.service';
import { LoginSecurityService } from './services/login-security.service';
import { SessionManagementService } from './services/session-management.service';
import { UserValidationService } from './services/user-validation.service';
import { SecurityMetricsService } from './services/security-metrics.service';

/**
 * Configures the auth module.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    SecurityModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('AuthModule');
        return {
          secret: (() => {
            const jwtSecret = configService.get<string>('JWT_SECRET');
            const nodeEnv = configService.get<string>('NODE_ENV');

            if (!jwtSecret) {
              if (nodeEnv === 'production') {
                throw new Error(
                  'JWT_SECRET environment variable is required for production deployment. Please set a secure JWT_SECRET in your environment variables.',
                );
              }
              logger.warn(
                '⚠️  WARNING: Using fallback JWT secret for development. Set JWT_SECRET environment variable for production.',
              );
              return 'dev-jwt-secret-change-in-production-' + Date.now();
            }

            if (jwtSecret.length < 32) {
              logger.warn(
                '⚠️  WARNING: JWT_SECRET should be at least 32 characters long for security.',
              );
            }

            return jwtSecret;
          })(),
          signOptions: {
            expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
            issuer: 'ai-recruitment-clerk',
            audience: 'ai-recruitment-users',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    // Core services
    AuthService,
    UserService,
    MfaService,
    EmailService,
    SmsService,
    // Strategies
    JwtStrategy,
    LocalStrategy,
    // Extracted AuthService services (SRP)
    JwtTokenService,
    PasswordService,
    LoginSecurityService,
    SessionManagementService,
    UserValidationService,
    SecurityMetricsService,
  ],
  controllers: [AuthController, MfaController, UsersController],
  exports: [
    AuthService,
    UserService,
    MfaService,
    JwtModule,
    PassportModule,
    // Export extracted services for use by other modules
    JwtTokenService,
    PasswordService,
    LoginSecurityService,
    SessionManagementService,
    UserValidationService,
    SecurityMetricsService,
  ],
})
export class AuthModule {}
