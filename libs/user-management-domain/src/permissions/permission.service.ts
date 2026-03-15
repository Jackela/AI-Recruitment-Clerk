import { Injectable } from '@nestjs/common';
import { Permission, UserRole } from '../index';

/**
 * Permission check result.
 */
export interface PermissionCheckResult {
  granted: boolean;
  missing: Permission[];
}

/**
 * Permission service for role-based access control.
 */
@Injectable()
export class PermissionService {
  /**
   * Role to permissions mapping.
   */
  private readonly rolePermissions: Map<UserRole, Permission[]> = new Map([
    [
      UserRole.ADMIN,
      [
        Permission.ADMIN,
        Permission.READ_USERS,
        Permission.WRITE_USERS,
        Permission.DELETE_USERS,
        Permission.READ_ANALYSIS,
        Permission.VIEW_ANALYTICS,
        Permission.GENERATE_REPORT,
        Permission.SYSTEM_CONFIG,
        Permission.VIEW_LOGS,
        Permission.MANAGE_INTEGRATIONS,
      ],
    ],
    [
      UserRole.HR_MANAGER,
      [
        Permission.READ_USERS,
        Permission.READ_USER,
        Permission.WRITE_USERS,
        Permission.READ_ANALYSIS,
        Permission.VIEW_ANALYTICS,
        Permission.GENERATE_REPORT,
        Permission.CREATE_JOB,
        Permission.READ_JOB,
        Permission.UPDATE_JOB,
        Permission.UPLOAD_RESUME,
        Permission.PROCESS_RESUME,
        Permission.READ_RESUME,
        Permission.SEARCH_RESUME,
        Permission.CREATE_USER,
        Permission.UPDATE_USER,
        Permission.MANAGE_USER,
        Permission.READ_ANALYTICS,
        Permission.MANAGE_QUOTAS,
        Permission.READ_USAGE_LIMITS,
        Permission.READ_USAGE_DETAILS,
      ],
    ],
    [
      UserRole.RECRUITER,
      [
        Permission.READ_USER,
        Permission.READ_ANALYSIS,
        Permission.UPLOAD_RESUME,
        Permission.PROCESS_RESUME,
        Permission.READ_RESUME,
        Permission.SEARCH_RESUME,
        Permission.CREATE_JOB,
        Permission.READ_JOB,
        Permission.UPDATE_JOB,
        Permission.CREATE_QUESTIONNAIRE,
        Permission.UPDATE_QUESTIONNAIRE,
        Permission.DELETE_QUESTIONNAIRE,
        Permission.PUBLISH_QUESTIONNAIRE,
        Permission.READ_QUESTIONNAIRE_RESPONSES,
        Permission.READ_QUESTIONNAIRE_ANALYTICS,
        Permission.EXPORT_QUESTIONNAIRE_DATA,
        Permission.READ_ANALYTICS,
      ],
    ],
    [
      UserRole.USER,
      [
        Permission.READ_USER,
        Permission.UPLOAD_RESUME,
        Permission.READ_RESUME,
        Permission.READ_JOB,
      ],
    ],
  ]);

  /**
   * Check if user has a specific permission.
   */
  public hasPermission(
    userPermissions: Permission[],
    requiredPermission: Permission,
  ): boolean {
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Check if user has all required permissions.
   */
  public hasAllPermissions(
    userPermissions: Permission[],
    requiredPermissions: Permission[],
  ): PermissionCheckResult {
    const missing = requiredPermissions.filter(
      (permission) => !userPermissions.includes(permission),
    );

    return {
      granted: missing.length === 0,
      missing,
    };
  }

  /**
   * Check if user has any of the required permissions.
   */
  public hasAnyPermission(
    userPermissions: Permission[],
    requiredPermissions: Permission[],
  ): boolean {
    return requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );
  }

  /**
   * Get permissions for a role.
   */
  public getRolePermissions(role: UserRole): Permission[] {
    return this.rolePermissions.get(role) || [];
  }

  /**
   * Get permissions for multiple roles.
   */
  public getRolesPermissions(roles: UserRole[]): Permission[] {
    const permissions = new Set<Permission>();

    roles.forEach((role) => {
      const rolePerms = this.getRolePermissions(role);
      rolePerms.forEach((perm) => permissions.add(perm));
    });

    return Array.from(permissions);
  }

  /**
   * Check if permission is inherited from roles.
   */
  public isInheritedPermission(
    userRoles: UserRole[],
    permission: Permission,
  ): boolean {
    const rolePermissions = this.getRolesPermissions(userRoles);
    return rolePermissions.includes(permission);
  }

  /**
   * Get all unique permissions across all roles.
   */
  public getAllPermissions(): Permission[] {
    const allPermissions = new Set<Permission>();

    this.rolePermissions.forEach((permissions) => {
      permissions.forEach((perm) => allPermissions.add(perm));
    });

    return Array.from(allPermissions);
  }

  /**
   * Check permission with inheritance from roles.
   */
  public checkPermissionWithInheritance(
    userPermissions: Permission[],
    userRoles: UserRole[],
    requiredPermission: Permission,
  ): boolean {
    // Direct permission check
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Inherited from roles
    return this.isInheritedPermission(userRoles, requiredPermission);
  }

  /**
   * Evaluate dynamic permission condition.
   */
  public evaluateDynamicPermission(
    context: Record<string, unknown>,
    condition: (ctx: Record<string, unknown>) => boolean,
  ): boolean {
    return condition(context);
  }

  /**
   * Check resource ownership permission.
   */
  public checkResourceOwnership(
    userId: string,
    resourceOwnerId: string,
    userPermissions: Permission[],
    adminPermission: Permission = Permission.ADMIN,
  ): boolean {
    // User owns the resource
    if (userId === resourceOwnerId) {
      return true;
    }

    // User has admin permission
    if (userPermissions.includes(adminPermission)) {
      return true;
    }

    return false;
  }

  /**
   * Check organization access permission.
   */
  public checkOrganizationAccess(
    userOrgId: string,
    targetOrgId: string,
    userPermissions: Permission[],
    crossOrgPermission: Permission = Permission.ADMIN,
  ): boolean {
    // Same organization
    if (userOrgId === targetOrgId) {
      return true;
    }

    // Has cross-organization permission
    if (userPermissions.includes(crossOrgPermission)) {
      return true;
    }

    return false;
  }

  /**
   * Grant permission to role.
   */
  public grantPermissionToRole(role: UserRole, permission: Permission): void {
    const currentPerms = this.rolePermissions.get(role) || [];
    if (!currentPerms.includes(permission)) {
      this.rolePermissions.set(role, [...currentPerms, permission]);
    }
  }

  /**
   * Revoke permission from role.
   */
  public revokePermissionFromRole(role: UserRole, permission: Permission): void {
    const currentPerms = this.rolePermissions.get(role) || [];
    this.rolePermissions.set(
      role,
      currentPerms.filter((p) => p !== permission),
    );
  }

  /**
   * Get roles that have a specific permission.
   */
  public getRolesWithPermission(permission: Permission): UserRole[] {
    const roles: UserRole[] = [];

    this.rolePermissions.forEach((permissions, role) => {
      if (permissions.includes(permission)) {
        roles.push(role);
      }
    });

    return roles;
  }
}
