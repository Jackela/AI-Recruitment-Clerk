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
import { UserDto, UserRole } from '@ai-recruitment-clerk/user-management-domain';
import { UserService } from './user.service';

interface AuthenticatedRequest extends Request {
  user: UserDto;
}

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('activity')
  @HttpCode(HttpStatus.OK)
  getActivity() {
    return { active: true, timestamp: new Date().toISOString() };
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfilePost(@Request() req: AuthenticatedRequest) {
    // Accepts partial fields; persist via UserService
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

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfilePut(@Request() req: AuthenticatedRequest) {
    return this.updateProfilePost(req);
  }

  @UseGuards(JwtAuthGuard)
  @Get('organization/users')
  @HttpCode(HttpStatus.OK)
  async getOrganizationUsers(@Request() req: AuthenticatedRequest) {
    // Enforce simple RBAC: only admins (and optionally HR managers) can list org users
    if (
      req.user.role !== UserRole.ADMIN &&
      req.user.role !== UserRole.HR_MANAGER
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
        role: u.role,
        organizationId: u.organizationId,
      })),
    };
  }
}
