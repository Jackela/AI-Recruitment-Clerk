import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { PermissionCheckResult } from './permission.service';
import { PermissionService } from './permission.service';
import { Permission, UserRole } from '../index';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionService],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', () => {
      const userPermissions = [Permission.READ_USERS, Permission.WRITE_USERS];

      expect(
        service.hasPermission(userPermissions, Permission.READ_USERS),
      ).toBe(true);
    });

    it('should return false when user does not have permission', () => {
      const userPermissions = [Permission.READ_USERS];

      expect(service.hasPermission(userPermissions, Permission.ADMIN)).toBe(
        false,
      );
    });

    it('should return false for empty permissions array', () => {
      expect(service.hasPermission([], Permission.READ_USERS)).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should grant access when all permissions are present', () => {
      const userPermissions = [
        Permission.READ_USERS,
        Permission.WRITE_USERS,
        Permission.ADMIN,
      ];
      const required = [Permission.READ_USERS, Permission.WRITE_USERS];

      const result: PermissionCheckResult = service.hasAllPermissions(
        userPermissions,
        required,
      );

      expect(result.granted).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should deny access when some permissions are missing', () => {
      const userPermissions = [Permission.READ_USERS];
      const required = [Permission.READ_USERS, Permission.WRITE_USERS];

      const result: PermissionCheckResult = service.hasAllPermissions(
        userPermissions,
        required,
      );

      expect(result.granted).toBe(false);
      expect(result.missing).toContain(Permission.WRITE_USERS);
    });

    it('should deny access when all permissions are missing', () => {
      const userPermissions: Permission[] = [];
      const required = [Permission.READ_USERS, Permission.WRITE_USERS];

      const result: PermissionCheckResult = service.hasAllPermissions(
        userPermissions,
        required,
      );

      expect(result.granted).toBe(false);
      expect(result.missing).toHaveLength(2);
    });

    it('should grant access when no permissions are required', () => {
      const userPermissions: Permission[] = [];
      const required: Permission[] = [];

      const result: PermissionCheckResult = service.hasAllPermissions(
        userPermissions,
        required,
      );

      expect(result.granted).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', () => {
      const userPermissions = [Permission.READ_USERS];
      const required = [Permission.READ_USERS, Permission.WRITE_USERS];

      expect(service.hasAnyPermission(userPermissions, required)).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      const userPermissions = [Permission.READ_USERS];
      const required = [Permission.WRITE_USERS, Permission.ADMIN];

      expect(service.hasAnyPermission(userPermissions, required)).toBe(false);
    });

    it('should return false for empty user permissions', () => {
      expect(service.hasAnyPermission([], [Permission.READ_USERS])).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    it('should return ADMIN permissions', () => {
      const perms = service.getRolePermissions(UserRole.ADMIN);

      expect(perms).toContain(Permission.ADMIN);
      expect(perms).toContain(Permission.READ_USERS);
      expect(perms).toContain(Permission.WRITE_USERS);
      expect(perms).toContain(Permission.DELETE_USERS);
    });

    it('should return HR_MANAGER permissions', () => {
      const perms = service.getRolePermissions(UserRole.HR_MANAGER);

      expect(perms).toContain(Permission.READ_USERS);
      expect(perms).toContain(Permission.CREATE_JOB);
      expect(perms).toContain(Permission.MANAGE_USER);
      expect(perms).not.toContain(Permission.ADMIN);
    });

    it('should return RECRUITER permissions', () => {
      const perms = service.getRolePermissions(UserRole.RECRUITER);

      expect(perms).toContain(Permission.READ_RESUME);
      expect(perms).toContain(Permission.CREATE_JOB);
      expect(perms).not.toContain(Permission.MANAGE_USER);
    });

    it('should return USER permissions', () => {
      const perms = service.getRolePermissions(UserRole.USER);

      expect(perms).toContain(Permission.READ_USER);
      expect(perms).toContain(Permission.UPLOAD_RESUME);
      expect(perms).not.toContain(Permission.CREATE_JOB);
    });

    it('should return empty array for unknown role', () => {
      const perms = service.getRolePermissions('unknown' as UserRole);

      expect(perms).toEqual([]);
    });
  });

  describe('getRolesPermissions', () => {
    it('should combine permissions from multiple roles', () => {
      const perms = service.getRolesPermissions([
        UserRole.RECRUITER,
        UserRole.USER,
      ]);

      expect(perms).toContain(Permission.READ_RESUME);
      expect(perms).toContain(Permission.READ_USER);
    });

    it('should remove duplicates', () => {
      const perms = service.getRolesPermissions([
        UserRole.ADMIN,
        UserRole.HR_MANAGER,
      ]);
      const readUsersCount = perms.filter(
        (p) => p === Permission.READ_USERS,
      ).length;

      expect(readUsersCount).toBe(1);
    });

    it('should return empty array for empty roles', () => {
      const perms = service.getRolesPermissions([]);

      expect(perms).toEqual([]);
    });
  });

  describe('isInheritedPermission', () => {
    it('should return true for inherited permission', () => {
      const result = service.isInheritedPermission(
        [UserRole.ADMIN],
        Permission.ADMIN,
      );

      expect(result).toBe(true);
    });

    it('should return false for non-inherited permission', () => {
      const result = service.isInheritedPermission(
        [UserRole.USER],
        Permission.ADMIN,
      );

      expect(result).toBe(false);
    });

    it('should check multiple roles', () => {
      const result = service.isInheritedPermission(
        [UserRole.USER, UserRole.RECRUITER],
        Permission.CREATE_JOB,
      );

      expect(result).toBe(true);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all unique permissions', () => {
      const allPerms = service.getAllPermissions();

      expect(allPerms.length).toBeGreaterThan(0);
      expect(new Set(allPerms).size).toBe(allPerms.length);
    });

    it('should include common permissions', () => {
      const allPerms = service.getAllPermissions();

      expect(allPerms).toContain(Permission.READ_USERS);
      expect(allPerms).toContain(Permission.ADMIN);
    });
  });

  describe('checkPermissionWithInheritance', () => {
    it('should grant access for direct permission', () => {
      const result = service.checkPermissionWithInheritance(
        [Permission.READ_USERS],
        [],
        Permission.READ_USERS,
      );

      expect(result).toBe(true);
    });

    it('should grant access for inherited permission', () => {
      const result = service.checkPermissionWithInheritance(
        [],
        [UserRole.ADMIN],
        Permission.ADMIN,
      );

      expect(result).toBe(true);
    });

    it('should deny access without permission or inheritance', () => {
      const result = service.checkPermissionWithInheritance(
        [],
        [UserRole.USER],
        Permission.ADMIN,
      );

      expect(result).toBe(false);
    });
  });

  describe('evaluateDynamicPermission', () => {
    it('should evaluate true condition', () => {
      const context = { userId: '123', resourceOwnerId: '123' };
      const condition = (ctx: Record<string, unknown>) =>
        ctx.userId === ctx.resourceOwnerId;

      const result = service.evaluateDynamicPermission(context, condition);

      expect(result).toBe(true);
    });

    it('should evaluate false condition', () => {
      const context = { userId: '123', resourceOwnerId: '456' };
      const condition = (ctx: Record<string, unknown>) =>
        ctx.userId === ctx.resourceOwnerId;

      const result = service.evaluateDynamicPermission(context, condition);

      expect(result).toBe(false);
    });

    it('should evaluate complex condition', () => {
      const context = { age: 25, verified: true };
      const condition = (ctx: Record<string, unknown>) =>
        (ctx.age as number) >= 18 && ctx.verified === true;

      const result = service.evaluateDynamicPermission(context, condition);

      expect(result).toBe(true);
    });
  });

  describe('checkResourceOwnership', () => {
    it('should grant access to resource owner', () => {
      const result = service.checkResourceOwnership('user-1', 'user-1', []);

      expect(result).toBe(true);
    });

    it('should deny access to non-owner without admin permission', () => {
      const result = service.checkResourceOwnership('user-1', 'user-2', [
        Permission.READ_USERS,
      ]);

      expect(result).toBe(false);
    });

    it('should grant access with admin permission', () => {
      const result = service.checkResourceOwnership('user-1', 'user-2', [
        Permission.ADMIN,
      ]);

      expect(result).toBe(true);
    });

    it('should use custom admin permission', () => {
      const result = service.checkResourceOwnership(
        'user-1',
        'user-2',
        [Permission.WRITE_USERS],
        Permission.WRITE_USERS,
      );

      expect(result).toBe(true);
    });
  });

  describe('checkOrganizationAccess', () => {
    it('should grant access to same organization', () => {
      const result = service.checkOrganizationAccess('org-1', 'org-1', []);

      expect(result).toBe(true);
    });

    it('should deny access to different organization without permission', () => {
      const result = service.checkOrganizationAccess('org-1', 'org-2', [
        Permission.READ_USERS,
      ]);

      expect(result).toBe(false);
    });

    it('should grant access with cross-org permission', () => {
      const result = service.checkOrganizationAccess('org-1', 'org-2', [
        Permission.ADMIN,
      ]);

      expect(result).toBe(true);
    });

    it('should use custom cross-org permission', () => {
      const result = service.checkOrganizationAccess(
        'org-1',
        'org-2',
        [Permission.SYSTEM_CONFIG],
        Permission.SYSTEM_CONFIG,
      );

      expect(result).toBe(true);
    });
  });

  describe('grantPermissionToRole', () => {
    it('should add permission to role', () => {
      service.grantPermissionToRole(UserRole.USER, Permission.CREATE_JOB);

      const perms = service.getRolePermissions(UserRole.USER);
      expect(perms).toContain(Permission.CREATE_JOB);
    });

    it('should not duplicate existing permission', () => {
      service.grantPermissionToRole(UserRole.USER, Permission.READ_USER);

      const perms = service.getRolePermissions(UserRole.USER);
      const readUserCount = perms.filter(
        (p) => p === Permission.READ_USER,
      ).length;

      expect(readUserCount).toBe(1);
    });
  });

  describe('revokePermissionFromRole', () => {
    it('should remove permission from role', () => {
      service.revokePermissionFromRole(
        UserRole.RECRUITER,
        Permission.CREATE_JOB,
      );

      const perms = service.getRolePermissions(UserRole.RECRUITER);
      expect(perms).not.toContain(Permission.CREATE_JOB);
    });

    it('should handle non-existent permission gracefully', () => {
      service.revokePermissionFromRole(UserRole.USER, Permission.ADMIN);

      const perms = service.getRolePermissions(UserRole.USER);
      expect(perms).not.toContain(Permission.ADMIN);
    });
  });

  describe('getRolesWithPermission', () => {
    it('should return roles with specific permission', () => {
      const roles = service.getRolesWithPermission(Permission.ADMIN);

      expect(roles).toContain(UserRole.ADMIN);
      expect(roles).not.toContain(UserRole.USER);
    });

    it('should return multiple roles with shared permission', () => {
      const roles = service.getRolesWithPermission(Permission.READ_USERS);

      expect(roles.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for non-existent permission', () => {
      const roles = service.getRolesWithPermission(
        'non-existent' as Permission,
      );

      expect(roles).toEqual([]);
    });
  });
});
