import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';
import { UserManagementIntegrationService } from './user-management-integration.service';
import { UserManagementRepository } from './user-management.repository';
import { User, UserSchema } from '../../schemas/user.schema';
import { AppCacheModule } from '../../cache/cache.module';
import { AuthModule } from '../../auth/auth.module';

/**
 * 用户管理模块 - 用户档案和会话管理
 * 集成UserManagementDomainService与基础设施层
 */
@Module({
  imports: [
    AppCacheModule,
    AuthModule, // Import AuthModule to access UserService
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UserManagementController],
  providers: [
    UserManagementService, // Add the service that's used by the controller
    UserManagementIntegrationService,
    UserManagementRepository,
  ],
  exports: [
    UserManagementService, // Export the service
    UserManagementIntegrationService,
    UserManagementRepository,
  ],
})
export class UserManagementModule {}
