import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, UserDto, UserRole, UserStatus } from '../../../../libs/shared-dtos/src';

// In a real implementation, this would connect to MongoDB
// For now, we'll use a simple in-memory store with some mock users
interface UserEntity extends UserDto {
  password: string;
  lastActivity?: Date;
}

@Injectable()
export class UserService {
  private users: Map<string, UserEntity> = new Map();
  private emailToIdMap: Map<string, string> = new Map();

  constructor() {
    // Initialize with some default users for development
    this.initializeDefaultUsers();
  }

  private initializeDefaultUsers() {
    const defaultUsers: UserEntity[] = [
      {
        id: 'admin-001',
        email: 'admin@ai-recruitment.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewflcAAaZMhV1S6m', // password: admin123
        firstName: 'System',
        lastName: 'Administrator',
        get name() { return `${this.firstName} ${this.lastName}`; },
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserEntity,
      {
        id: 'hr-001',
        email: 'hr@ai-recruitment.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewflcAAaZMhV1S6m', // password: admin123
        firstName: 'HR',
        lastName: 'Manager',
        get name() { return `${this.firstName} ${this.lastName}`; },
        role: UserRole.HR_MANAGER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserEntity,
      {
        id: 'recruiter-001',
        email: 'recruiter@ai-recruitment.com',
        password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewflcAAaZMhV1S6m', // password: admin123
        firstName: 'Jane',
        lastName: 'Recruiter',
        get name() { return `${this.firstName} ${this.lastName}`; },
        role: UserRole.RECRUITER,
        organizationId: 'org-001',
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserEntity
    ];

    defaultUsers.forEach(user => {
      this.users.set(user.id, user);
      this.emailToIdMap.set(user.email, user.id);
    });
  }

  async create(createUserDto: CreateUserDto & { password: string }): Promise<UserEntity> {
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const user: UserEntity = {
      id,
      email: createUserDto.email,
      password: createUserDto.password,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      get name() { return `${this.firstName} ${this.lastName}`; },
      role: createUserDto.role,
      organizationId: createUserDto.organizationId,
      status: createUserDto.status || UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now
    };

    this.users.set(id, user);
    this.emailToIdMap.set(user.email, id);

    return user;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const id = this.emailToIdMap.get(email);
    return id ? this.users.get(id) || null : null;
  }

  async findByOrganizationId(organizationId: string): Promise<UserEntity[]> {
    return Array.from(this.users.values()).filter(
      user => user.organizationId === organizationId
    );
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = hashedPassword;
    user.updatedAt = new Date();
    this.users.set(id, user);
  }

  async updateLastActivity(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastActivity = new Date();
      this.users.set(id, user);
    }
  }

  async updateUser(id: string, updates: Partial<Omit<UserDto, 'id' | 'createdAt'>>): Promise<UserEntity> {
    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update email mapping if email is being changed
    if (updates.email && updates.email !== user.email) {
      this.emailToIdMap.delete(user.email);
      this.emailToIdMap.set(updates.email, id);
    }

    const updatedUser = {
      ...user,
      ...updates,
      get name() { return `${this.firstName} ${this.lastName}`; },
      updatedAt: new Date()
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      this.emailToIdMap.delete(user.email);
      this.users.delete(id);
    }
  }

  async listUsers(organizationId?: string): Promise<UserEntity[]> {
    const users = Array.from(this.users.values());
    
    if (organizationId) {
      return users.filter(user => user.organizationId === organizationId);
    }
    
    return users;
  }

  // Health check for service
  async getStats(): Promise<{ totalUsers: number; activeUsers: number; organizations: string[] }> {
    const users = Array.from(this.users.values());
    const activeUsers = users.filter(user => user.status === UserStatus.ACTIVE);
    const organizations = [...new Set(users.map(user => user.organizationId).filter(Boolean))];

    return {
      totalUsers: users.length,
      activeUsers: activeUsers.length,
      organizations
    };
  }
}