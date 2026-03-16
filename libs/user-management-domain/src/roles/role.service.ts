import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../index';

/**
 * Role entity.
 */
export interface Role {
  id: string;
  name: string;
  key: UserRole;
  description?: string;
  isDefault: boolean;
  permissions: string[];
  hierarchyLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role assignment.
 */
export interface RoleAssignment {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy?: string;
}

/**
 * Role repository interface.
 */
export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByKey(key: UserRole): Promise<Role | null>;
  findAll(): Promise<Role[]>;
  findDefault(): Promise<Role | null>;
  create(role: Role): Promise<Role>;
  update(id: string, role: Partial<Role>): Promise<Role>;
  delete(id: string): Promise<boolean>;
}

/**
 * Role assignment repository interface.
 */
export interface RoleAssignmentRepository {
  findByUserId(userId: string): Promise<RoleAssignment[]>;
  findByRoleId(roleId: string): Promise<RoleAssignment[]>;
  assignRole(assignment: RoleAssignment): Promise<RoleAssignment>;
  removeRole(userId: string, roleId: string): Promise<boolean>;
  removeAllUserRoles(userId: string): Promise<void>;
}

/**
 * Role service for managing roles and assignments.
 */
@Injectable()
export class RoleService {
  constructor(
    @Inject('RoleRepository')
    private readonly roleRepository: RoleRepository,
    @Inject('RoleAssignmentRepository')
    private readonly assignmentRepository: RoleAssignmentRepository,
  ) {}

  /**
   * Create a new role.
   */
  public async createRole(roleData: {
    name: string;
    key: UserRole;
    description?: string;
    permissions: string[];
    hierarchyLevel?: number;
  }): Promise<Role> {
    // Check if role with key already exists
    const existingRole = await this.roleRepository.findByKey(roleData.key);
    if (existingRole) {
      throw new ConflictException(
        `Role with key ${roleData.key} already exists`,
      );
    }

    const role: Role = {
      id: this.generateId(),
      name: roleData.name,
      key: roleData.key,
      description: roleData.description,
      permissions: roleData.permissions,
      hierarchyLevel: roleData.hierarchyLevel ?? 0,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.roleRepository.create(role);
  }

  /**
   * Find role by ID.
   */
  public async findById(id: string): Promise<Role> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }
    return role;
  }

  /**
   * Find role by key.
   */
  public async findByKey(key: UserRole): Promise<Role> {
    const role = await this.roleRepository.findByKey(key);
    if (!role) {
      throw new NotFoundException(`Role with key ${key} not found`);
    }
    return role;
  }

  /**
   * Get all roles.
   */
  public async findAll(): Promise<Role[]> {
    return this.roleRepository.findAll();
  }

  /**
   * Update role.
   */
  public async updateRole(
    id: string,
    updates: Partial<Omit<Role, 'id' | 'createdAt'>>,
  ): Promise<Role> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    // Prevent changing key of default roles
    if (role.isDefault && updates.key && updates.key !== role.key) {
      throw new ConflictException('Cannot change key of default roles');
    }

    const updatedRole = {
      ...role,
      ...updates,
      updatedAt: new Date(),
    };

    return this.roleRepository.update(id, updatedRole);
  }

  /**
   * Delete role.
   */
  public async deleteRole(id: string): Promise<void> {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    if (role.isDefault) {
      throw new ConflictException('Cannot delete default roles');
    }

    await this.roleRepository.delete(id);
  }

  /**
   * Assign role to user.
   */
  public async assignRole(
    userId: string,
    roleId: string,
    assignedBy?: string,
  ): Promise<RoleAssignment> {
    // Verify role exists
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with id ${roleId} not found`);
    }

    const assignment: RoleAssignment = {
      userId,
      roleId,
      assignedAt: new Date(),
      assignedBy,
    };

    return this.assignmentRepository.assignRole(assignment);
  }

  /**
   * Remove role from user.
   */
  public async removeRole(userId: string, roleId: string): Promise<void> {
    const removed = await this.assignmentRepository.removeRole(userId, roleId);
    if (!removed) {
      throw new NotFoundException('Role assignment not found');
    }
  }

  /**
   * Get user roles.
   */
  public async getUserRoles(userId: string): Promise<Role[]> {
    const assignments = await this.assignmentRepository.findByUserId(userId);
    const roles: Role[] = [];

    for (const assignment of assignments) {
      const role = await this.roleRepository.findById(assignment.roleId);
      if (role) {
        roles.push(role);
      }
    }

    return roles;
  }

  /**
   * Get users with role.
   */
  public async getUsersWithRole(roleId: string): Promise<string[]> {
    const assignments = await this.assignmentRepository.findByRoleId(roleId);
    return assignments.map((a) => a.userId);
  }

  /**
   * Set default role.
   */
  public async setDefaultRole(roleId: string): Promise<Role> {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with id ${roleId} not found`);
    }

    return this.roleRepository.update(roleId, {
      isDefault: true,
      updatedAt: new Date(),
    });
  }

  /**
   * Get default role.
   */
  public async getDefaultRole(): Promise<Role | null> {
    return this.roleRepository.findDefault();
  }

  /**
   * Check if role has higher hierarchy than another.
   */
  public hasHigherHierarchy(role1: Role, role2: Role): boolean {
    return role1.hierarchyLevel > role2.hierarchyLevel;
  }

  /**
   * Check if user can manage role.
   */
  public canManageRole(userRole: Role, targetRole: Role): boolean {
    // User with higher hierarchy can manage lower roles
    return this.hasHigherHierarchy(userRole, targetRole);
  }

  /**
   * Get role hierarchy.
   */
  public async getRoleHierarchy(): Promise<Role[]> {
    const roles = await this.roleRepository.findAll();
    return roles.sort((a, b) => b.hierarchyLevel - a.hierarchyLevel);
  }

  /**
   * Initialize default roles.
   */
  public async initializeDefaultRoles(): Promise<void> {
    const defaultRoles: Array<{
      name: string;
      key: UserRole;
      description: string;
      permissions: string[];
      hierarchyLevel: number;
    }> = [
      {
        name: 'Administrator',
        key: UserRole.ADMIN,
        description: 'Full system access',
        permissions: ['*'],
        hierarchyLevel: 100,
      },
      {
        name: 'HR Manager',
        key: UserRole.HR_MANAGER,
        description: 'HR management access',
        permissions: ['read:users', 'write:users', 'manage:jobs'],
        hierarchyLevel: 75,
      },
      {
        name: 'Recruiter',
        key: UserRole.RECRUITER,
        description: 'Recruiting access',
        permissions: ['read:users', 'create:jobs', 'manage:resumes'],
        hierarchyLevel: 50,
      },
      {
        name: 'User',
        key: UserRole.USER,
        description: 'Basic user access',
        permissions: ['read:user', 'upload:resume'],
        hierarchyLevel: 10,
      },
    ];

    for (const roleData of defaultRoles) {
      const existing = await this.roleRepository.findByKey(roleData.key);
      if (!existing) {
        await this.roleRepository.create({
          id: this.generateId(),
          ...roleData,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  /**
   * Clear all user roles.
   */
  public async clearUserRoles(userId: string): Promise<void> {
    await this.assignmentRepository.removeAllUserRoles(userId);
  }

  /**
   * Generate unique ID.
   */
  private generateId(): string {
    return `role-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
