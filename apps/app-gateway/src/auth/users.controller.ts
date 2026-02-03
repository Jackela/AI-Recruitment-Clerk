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
import type {
  UserDto,
  AuthenticatedRequest} from '@ai-recruitment-clerk/user-management-domain';
import {
  UserRole
} from '@ai-recruitment-clerk/user-management-domain';
import type { UserService } from './user.service';

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
  public getProfile(@Request() req: AuthenticatedRequest): UserDto {
    return req.user;
  }

  /**
   * Retrieves activity.
   * @returns The result of the operation.
   */
  @UseGuards(JwtAuthGuard)
  @Get('activity')
  @HttpCode(HttpStatus.OK)
  public getActivity(): { active: boolean; timestamp: string } {
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
  public async updateProfilePost(@Request() req: AuthenticatedRequest): Promise<Partial<UserDto>> {
    // Accepts partial fields; persist via UserService
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Partial<UserDto> = (req as any).body || {};
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
  public async updateProfilePut(@Request() req: AuthenticatedRequest): Promise<Partial<UserDto>> {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async getOrganizationUsers(@Request() req: AuthenticatedRequest): Promise<any> {
    // Enforce simple RBAC: only admins (and optionally HR managers) can list org users
    const requesterRole = String(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req.user as any)?.rawRole ?? req.user.role ?? '',
    ).toLowerCase();

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: String((u as any)?.rawRole ?? u.role ?? '').toLowerCase(),
        organizationId: u.organizationId,
      })),
    };
  }
}
