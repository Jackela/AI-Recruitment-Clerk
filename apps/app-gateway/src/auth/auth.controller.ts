import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request, 
  Get,
  Patch,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { LoginDto, CreateUserDto, AuthResponseDto, RefreshTokenDto, UserDto, Permission, UserRole } from '@ai-recruitment-clerk/user-management-domain';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Permissions } from './decorators/permissions.decorator';
import { Public } from './decorators/public.decorator';

interface AuthenticatedRequest extends Request {
  user: UserDto;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto): Promise<AuthResponseDto> {
    return this.authService.register(createUserDto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: AuthenticatedRequest, @Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: AuthenticatedRequest): Promise<{ message: string }> {
    await this.authService.logout(req.user.id);
    return { message: 'Successfully logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest): Promise<UserDto> {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() body: { currentPassword: string; newPassword: string }
  ): Promise<{ message: string }> {
    await this.authService.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword
    );
    return { message: 'Password changed successfully' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions(Permission.READ_USER)
  @Get('users')
  async getUsers(@Request() req: AuthenticatedRequest): Promise<UserDto[]> {
    // HR Managers and Recruiters can only see users in their organization
    const organizationId = req.user.role === UserRole.ADMIN ? undefined : req.user.organizationId;
    const users = await this.userService.listUsers(organizationId);
    
    // Remove password field from response
    return users.map(({ password, ...userWithoutPassword }) => userWithoutPassword as UserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Permissions(Permission.READ_USER)
  @Get('users/stats')
  async getUserStats(): Promise<{ totalUsers: number; activeUsers: number; organizations: string[] }> {
    return this.userService.getStats();
  }

  @Public()
  @Get('health')
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  }
}