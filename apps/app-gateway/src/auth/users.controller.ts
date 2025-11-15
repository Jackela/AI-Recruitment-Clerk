import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
  Post,
  Put,
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  CreateUserDto,
  UserDto,
  UserRole,
  AuthenticatedRequest,
} from '@ai-recruitment-clerk/user-management-domain';
import { UserService } from './user.service';

// Use shared AuthenticatedRequest type

/**
 * Exposes endpoints for users.
 */
@Controller('users')
export class UsersController {
  /**
   * Initializes a new instance of the Users Controller.
   * @param userService - The user service.
   */
  constructor(private readonly userService: UserService) {}
  /**
   * Retrieves profile.
   * @param req - The req.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  /**
   * Retrieves activity.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('activity')
  @HttpCode(HttpStatus.OK)
  getActivity() {
    return { active: true, timestamp: new Date().toISOString() };
  }

  /**
   * Updates profile post.
   * @param req - The req.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Post('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfilePost(@Request() req: AuthenticatedRequest) {
    const body = req.body as Partial<CreateUserDto & UserDto>;
    const updates: Partial<UserDto> = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      organizationId: body.organizationId,
      role: body.role as UserRole | undefined,
      status: body.status,
    };
    const updated = await this.userService.updateUser(req.user.id, updates);
    return {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      name: updated.name,
      role: updated.role,
      organizationId: updated.organizationId,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Updates profile put.
   * @param req - The req.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfilePut(@Request() req: AuthenticatedRequest) {
    return this.updateProfilePost(req);
  }

  /**
   * Retrieves organization users.
   * @param req - The req.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('organization/users')
  @HttpCode(HttpStatus.OK)
  async getOrganizationUsers(@Request() req: AuthenticatedRequest) {
    // Enforce simple RBAC: only admins (and optionally HR managers) can list org users
    const requester = req.user as UserDto & { rawRole?: string };
    const requesterRole = (
      requester.rawRole ?? requester.role ?? ''
    ).toString().toLowerCase();

    if (
      requesterRole !== UserRole.ADMIN &&
      requesterRole !== UserRole.HR_MANAGER
    ) {
      return {
        success: false,
        error: 'Forbidden',
        statusCode: 403,
      };
    }

    const orgId = req.user.organizationId;
    const users = await this.userService.listUsers(orgId);
    return {
      users: users.map((u) => ({
        userId: u.id,
        email: u.email,
        name: u.name,
        role: u.role?.toString().toLowerCase(),
        organizationId: u.organizationId,
      })),
    };
  }
}
