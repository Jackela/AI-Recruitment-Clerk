import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import {
  UserDto,
  Permission,
  UserRole,
  UserStatus,
  CreateUserDto,
  UpdateUserDto,
  UserPreferencesDto,
  UserActivityDto,
  AuthenticatedRequest,
} from '@ai-recruitment-clerk/user-management-domain';
import { UserManagementService } from './user-management.service';

interface UserProfileResponse extends UserDto {
  preferences?: any;
  lastActivity?: Date;
  profileCompleteness?: number;
}

/**
 * Exposes endpoints for user management.
 */
@ApiTags('user-management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserManagementController {
  /**
   * Initializes a new instance of the User Management Controller.
   * @param userManagementService - The user management service.
   */
  constructor(private readonly userManagementService: UserManagementService) {}

  /**
   * Retrieves user profile.
   * @param req - The req.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取用户档案',
    description: '获取当前用户的完整档案信息，包括个人信息、偏好设置和活动统计',
  })
  @ApiResponse({
    status: 200,
    description: '用户档案获取成功',
    schema: {
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            organizationId: { type: 'string' },
            preferences: { type: 'object' },
            activitySummary: { type: 'object' },
            lastActivity: { type: 'string' },
          },
        },
      },
    },
  })
  @Get('profile')
  async getUserProfile(@Request() req: AuthenticatedRequest) {
    try {
      const profile = await this.userManagementService.getUserProfile(
        req.user.id!,
      );
      const activitySummary =
        await this.userManagementService.getUserActivitySummary(req.user.id!);

      return {
        success: true,
        data: {
          userId: req.user.id!,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          organizationId: req.user.organizationId,
          preferences: (profile as UserProfileResponse).preferences || {},
          activitySummary: {
            totalSessions: activitySummary.totalSessions,
            lastLoginDate: activitySummary.lastLoginDate,
            profileCompleteness: activitySummary.profileCompleteness,
            totalActions: activitySummary.totalActions,
          },
          lastActivity: (profile as UserProfileResponse).lastActivity,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve user profile',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Updates user profile.
   * @param req - The req.
   * @param updateData - The update data.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '更新用户档案',
    description: '更新用户的基本信息和个人档案',
  })
  @ApiResponse({ status: 200, description: '档案更新成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateUserProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateData: UpdateUserDto,
  ) {
    try {
      const updatedProfile = await this.userManagementService.updateUserProfile(
        req.user.id!,
        updateData,
      );

      return {
        success: true,
        message: 'User profile updated successfully',
        data: {
          userId: req.user.id!,
          updatedFields: Object.keys(updateData),
          profileCompleteness: (updatedProfile as UserProfileResponse)
            .profileCompleteness,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update user profile',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Updates user preferences.
   * @param req - The req.
   * @param preferences - The preferences.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '更新用户偏好',
    description: '更新用户的系统偏好设置，包括通知、界面和行为偏好',
  })
  @ApiResponse({ status: 200, description: '偏好更新成功' })
  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  async updateUserPreferences(
    @Request() req: AuthenticatedRequest,
    @Body() preferences: UserPreferencesDto,
  ) {
    try {
      await this.userManagementService.updateUserPreferences(
        req.user.id!,
        preferences,
      );

      return {
        success: true,
        message: 'User preferences updated successfully',
        data: {
          userId: req.user.id!,
          updatedPreferences: Object.keys(preferences),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update user preferences',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Retrieves user activity.
   * @param req - The req.
   * @param limit - The limit.
   * @param offset - The offset.
   * @param startDate - The start date.
   * @param endDate - The end date.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取用户活动历史',
    description: '获取用户的活动记录和使用统计',
  })
  @ApiResponse({ status: 200, description: '活动历史获取成功' })
  @ApiQuery({ name: 'limit', required: false, description: '返回记录数量限制' })
  @ApiQuery({ name: 'offset', required: false, description: '记录偏移量' })
  @ApiQuery({ name: 'startDate', required: false, description: '开始日期' })
  @ApiQuery({ name: 'endDate', required: false, description: '结束日期' })
  @Get('activity')
  async getUserActivity(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const activityData = await this.userManagementService.getUserActivity(
        req.user.id!,
        {
          limit: Math.min(limit, 100), // Cap at 100 records
          page: Math.max(Math.floor(offset / limit) + 1, 1),
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
      );

      return {
        success: true,
        data: {
          activities: activityData.activities,
          totalCount: activityData.totalCount,
          hasMore: activityData.hasMore,
          summary: activityData.summary,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve user activity',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Removes user account.
   * @param req - The req.
   * @param deleteRequest - The delete request.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '删除用户账户',
    description: '软删除用户账户（仅标记为已删除，保留审计记录）',
  })
  @ApiResponse({ status: 200, description: '账户删除成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  async deleteUserAccount(
    @Request() req: AuthenticatedRequest,
    @Body() deleteRequest: { confirmationPassword: string; reason?: string },
  ) {
    try {
      // Verify password for account deletion
      const isValidPassword =
        await this.userManagementService.verifyUserPassword(
          req.user.id!,
          deleteRequest.confirmationPassword,
        );

      if (!isValidPassword) {
        throw new ForbiddenException('Invalid password provided');
      }

      await this.userManagementService.softDeleteUser(
        req.user.id!,
        deleteRequest.reason,
      );

      return {
        success: true,
        message: 'User account has been successfully deleted',
        data: {
          userId: req.user.id,
          deletedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to delete user account',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Admin-only endpoints
  /**
   * Retrieves organization users.
   * @param req - The req.
   * @param page - The page.
   * @param limit - The limit.
   * @param role - The role.
   * @param status - The status.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '获取组织用户列表',
    description: '管理员获取组织内的所有用户（需要管理员权限）',
  })
  @ApiResponse({ status: 200, description: '用户列表获取成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.READ_USER)
  @Get('organization/users')
  async getOrganizationUsers(
    @Request() req: AuthenticatedRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('role') role?: UserRole,
    @Query('status') status?: string,
  ) {
    try {
      const organizationId =
        req.user.role === UserRole.ADMIN
          ? (req.query.organizationId as string)
          : req.user.organizationId;

      const users = await this.userManagementService.getOrganizationUsers(
        organizationId as string,
        {
          page: Math.max(page, 1),
          limit: Math.min(limit, 100),
          role,
          status: status as UserStatus,
        },
      );

      return {
        success: true,
        data: users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(users.totalCount / limit),
          totalCount: users.totalCount,
          hasNext: page * limit < users.totalCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve organization users',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Updates user status.
   * @param req - The req.
   * @param userId - The user id.
   * @param statusUpdate - The status update.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '更新用户状态',
    description: '管理员更新用户的账户状态（需要管理员权限）',
  })
  @ApiResponse({ status: 200, description: '用户状态更新成功' })
  @ApiParam({ name: 'userId', description: '用户ID' })
  @UseGuards(RolesGuard)
  @Permissions(Permission.MANAGE_USER)
  @Put(':userId/status')
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Request() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body()
    statusUpdate: {
      status: 'active' | 'inactive' | 'suspended';
      reason?: string;
    },
  ) {
    try {
      // Prevent self-status modification
      if (userId === req.user.id) {
        throw new ForbiddenException('Cannot modify your own account status');
      }

      await this.userManagementService.updateUserStatus(
        userId,
        statusUpdate.status as UserStatus,
        statusUpdate.reason,
      );

      return {
        success: true,
        message: 'User status updated successfully',
        data: {
          userId,
          newStatus: statusUpdate.status,
          updatedBy: req.user.id,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update user status',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Performs the health check operation.
   * @returns The result of the operation.
   */
  @ApiOperation({
    summary: '系统健康检查',
    description: '检查用户管理服务的健康状态',
  })
  @ApiResponse({ status: 200, description: '服务健康状态' })
  @Get('health')
  async healthCheck() {
    try {
      const healthStatus = await this.userManagementService.getHealthStatus();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'user-management',
        details: healthStatus,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'user-management',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
