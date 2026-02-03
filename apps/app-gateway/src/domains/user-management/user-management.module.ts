import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';
import { UserCrudService } from './user-crud.service';
import { UserAuthService } from './user-auth.service';
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
    UserCrudService, // CRUD service
    UserAuthService, // Auth service - must be before UserManagementService for DI
    UserManagementService, // Facade service that uses UserCrudService and UserAuthService
    UserManagementIntegrationService,
    UserManagementRepository,
  ],
  exports: [
    UserCrudService, // Export CRUD service for use in other modules
    UserAuthService, // Export auth service for use in other modules
    UserManagementService, // Export the facade service
    UserManagementIntegrationService,
    UserManagementRepository,
  ],
})
export class UserManagementModule {}
