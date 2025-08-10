import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UserService } from './user.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'ai-recruitment-secret-key-change-in-production',
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
          issuer: 'ai-recruitment-clerk',
          audience: 'ai-recruitment-users'
        }
      }),
      inject: [ConfigService]
    })
  ],
  providers: [
    AuthService,
    UserService,
    JwtStrategy,
    LocalStrategy
  ],
  controllers: [AuthController],
  exports: [AuthService, UserService, JwtModule, PassportModule]
})
export class AuthModule {}