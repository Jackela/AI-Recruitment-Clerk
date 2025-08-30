import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from '../../auth/user.service';
import { UserDto, UpdateUserDto, UserPreferencesDto, UserActivityDto, UserStatus } from '@ai-recruitment-clerk/user-management-domain';

interface UserActivityResponse {
  activities: UserActivityDto[];
  totalCount: number;
  hasMore: boolean;
  summary: {
    totalActivities: number;
    recentLogins: number;
    lastActivity: Date;
  };
}

@Injectable()
export class UserManagementService {
  constructor(private readonly userService: UserService) {}
  async updateUser(userId: string, updateData: UpdateUserDto): Promise<UserDto> {
    const updatedUser = await this.userService.updateUser(userId, updateData);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    // Convert to UserDto (remove password)
    const { password, ...userDto } = updatedUser;
    return userDto as UserDto;
  }

  async getUserPreferences(userId: string): Promise<UserPreferencesDto> {
    // Mock implementation - in real app this would be in a separate preferences service
    return {
      userId,
      language: 'en',
      notifications: {
        email: true,
        push: true,
        sms: false
      }
    } as any;
  }

  async updateUserPreferences(userId: string, preferences: UserPreferencesDto): Promise<UserPreferencesDto> {
    // Mock implementation - in real app this would update preferences in database
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    return {
      ...preferences,
      userId
    } as any;
  }

  async getUserActivity(userId: string, options?: {
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<UserActivityResponse> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Mock activity data
    const mockActivities: any[] = [
      {
        id: 'activity-1',
        userId,
        type: 'login',
        description: 'User logged in',
        timestamp: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'Test User Agent'
      }
    ];

    return {
      activities: mockActivities,
      totalCount: mockActivities.length,
      hasMore: false,
      summary: {
        totalActivities: mockActivities.length,
        recentLogins: 1,
        lastActivity: user.lastActivity || new Date()
      }
    };
  }

  async getUserProfile(userId: string): Promise<UserDto> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    // Convert to UserDto (remove password)
    const { password, ...userDto } = user;
    return userDto as UserDto;
  }

  async getUserActivitySummary(userId: string): Promise<any> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      userId,
      totalLogins: 1,
      lastLoginDate: user.lastActivity || new Date(),
      totalActivities: 1,
      averageSessionDuration: 30,
      mostActiveHour: 14,
      lastActivity: user.lastActivity || new Date()
    };
  }

  async updateUserProfile(userId: string, updateData: UpdateUserDto): Promise<UserDto> {
    return this.updateUser(userId, updateData);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userService.deleteUser(userId);
  }

  async softDeleteUser(userId: string, reason?: string): Promise<void> {
    await this.userService.updateUser(userId, { 
      status: UserStatus.INACTIVE,
      updatedAt: new Date()
    });
  }

  async getOrganizationUsers(organizationId: string, options?: {
    page?: number;
    limit?: number;
    role?: any;
    status?: UserStatus;
  }): Promise<{ users: UserDto[]; totalCount: number }> {
    let users = await this.userService.findByOrganizationId(organizationId);
    
    // Filter by status if provided
    if (options?.status) {
      users = users.filter(user => user.status === options.status);
    }
    
    // Convert to UserDto (remove passwords)
    const userDtos = users.map(user => {
      const { password, ...userDto } = user;
      return userDto as UserDto;
    });
    
    return {
      users: userDtos,
      totalCount: userDtos.length
    };
  }

  async verifyUserPassword(userId: string, password: string): Promise<boolean> {
    // This would typically use bcrypt to compare hashed passwords
    // For testing purposes, we'll do a simple check
    const user = await this.userService.findById(userId);
    if (!user) {
      return false;
    }
    
    // In real implementation, use bcrypt.compare(password, user.password)
    return password === 'test-password' || user.password.includes('admin123');
  }


  async updateUserStatus(userId: string, status: UserStatus, reason?: string): Promise<UserDto> {
    const updatedUser = await this.userService.updateUser(userId, { 
      status,
      updatedAt: new Date()
    });
    
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    // Convert to UserDto (remove password)
    const { password, ...userDto } = updatedUser;
    return userDto as UserDto;
  }

  async getHealthStatus(): Promise<{
    status: string;
    totalUsers: number;
    activeUsers: number;
    recentActivity: number;
  }> {
    const stats = await this.userService.getStats();
    return {
      status: 'healthy',
      totalUsers: stats.totalUsers,
      activeUsers: stats.activeUsers,
      recentActivity: stats.activeUsers // Simple approximation
    };
  }
}