import {
  Permission,
  ROLE_PERMISSIONS,
  RequiredPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from './permissions.dto';
import { UserRole } from './user.dto';

describe('PermissionsDto', () => {
  describe('Permission enum', () => {
    it('should have job management permissions', () => {
      expect(Permission.CREATE_JOB).toBe('create_job');
      expect(Permission.READ_JOB).toBe('read_job');
      expect(Permission.UPDATE_JOB).toBe('update_job');
      expect(Permission.DELETE_JOB).toBe('delete_job');
    });

    it('should have resume management permissions', () => {
      expect(Permission.UPLOAD_RESUME).toBe('upload_resume');
      expect(Permission.PROCESS_RESUME).toBe('process_resume');
      expect(Permission.READ_RESUME).toBe('read_resume');
      expect(Permission.DELETE_RESUME).toBe('delete_resume');
      expect(Permission.SEARCH_RESUME).toBe('search_resume');
    });

    it('should have analysis and report permissions', () => {
      expect(Permission.READ_ANALYSIS).toBe('read_analysis');
      expect(Permission.GENERATE_REPORT).toBe('generate_report');
    });

    it('should have questionnaire permissions', () => {
      expect(Permission.CREATE_QUESTIONNAIRE).toBe('create_questionnaire');
      expect(Permission.READ_QUESTIONNAIRE).toBe('read_questionnaire');
      expect(Permission.UPDATE_QUESTIONNAIRE).toBe('update_questionnaire');
      expect(Permission.DELETE_QUESTIONNAIRE).toBe('delete_questionnaire');
    });

    it('should have user management permissions', () => {
      expect(Permission.CREATE_USER).toBe('create_user');
      expect(Permission.READ_USER).toBe('read_user');
      expect(Permission.UPDATE_USER).toBe('update_user');
      expect(Permission.DELETE_USER).toBe('delete_user');
      expect(Permission.MANAGE_USER).toBe('manage_user');
    });

    it('should have admin permissions', () => {
      expect(Permission.ADMIN).toBe('admin');
      expect(Permission.SYSTEM_CONFIG).toBe('system_config');
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('should assign all permissions to ADMIN', () => {
      const adminPermissions = ROLE_PERMISSIONS[UserRole.ADMIN];

      expect(adminPermissions).toContain(Permission.CREATE_JOB);
      expect(adminPermissions).toContain(Permission.DELETE_JOB);
      expect(adminPermissions).toContain(Permission.ADMIN);
      expect(adminPermissions).toContain(Permission.SYSTEM_CONFIG);
      expect(adminPermissions.length).toBe(Object.values(Permission).length);
    });

    it('should assign limited permissions to VIEWER', () => {
      const viewerPermissions = ROLE_PERMISSIONS[UserRole.VIEWER];

      expect(viewerPermissions).toContain(Permission.READ_JOB);
      expect(viewerPermissions).toContain(Permission.READ_RESUME);
      expect(viewerPermissions).not.toContain(Permission.CREATE_JOB);
      expect(viewerPermissions).not.toContain(Permission.DELETE_JOB);
    });

    it('should assign recruiter permissions', () => {
      const recruiterPermissions = ROLE_PERMISSIONS[UserRole.RECRUITER];

      expect(recruiterPermissions).toContain(Permission.CREATE_JOB);
      expect(recruiterPermissions).toContain(Permission.READ_JOB);
      expect(recruiterPermissions).toContain(Permission.UPLOAD_RESUME);
      expect(recruiterPermissions).toContain(Permission.GENERATE_REPORT);
      expect(recruiterPermissions).not.toContain(Permission.DELETE_JOB);
    });

    it('should assign hr manager permissions', () => {
      const hrPermissions = ROLE_PERMISSIONS[UserRole.HR_MANAGER];

      expect(hrPermissions).toContain(Permission.CREATE_JOB);
      expect(hrPermissions).toContain(Permission.DELETE_JOB);
      expect(hrPermissions).toContain(Permission.MANAGE_USER);
      expect(hrPermissions).toContain(Permission.TRACK_METRICS);
    });
  });

  describe('hasPermission', () => {
    it('should return true for admin with any permission', () => {
      const result = hasPermission(UserRole.ADMIN, Permission.DELETE_USER);

      expect(result).toBe(true);
    });

    it('should return true for viewer with read permission', () => {
      const result = hasPermission(UserRole.VIEWER, Permission.READ_JOB);

      expect(result).toBe(true);
    });

    it('should return false for viewer with create permission', () => {
      const result = hasPermission(UserRole.VIEWER, Permission.CREATE_JOB);

      expect(result).toBe(false);
    });

    it('should return false for recruiter with admin permission', () => {
      const result = hasPermission(
        UserRole.RECRUITER,
        Permission.SYSTEM_CONFIG,
      );

      expect(result).toBe(false);
    });

    it('should return false for unknown role', () => {
      const result = hasPermission('unknown' as UserRole, Permission.READ_JOB);

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has at least one permission', () => {
      const result = hasAnyPermission(UserRole.VIEWER, [
        Permission.READ_JOB,
        Permission.CREATE_JOB,
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      const result = hasAnyPermission(UserRole.VIEWER, [
        Permission.CREATE_JOB,
        Permission.DELETE_JOB,
      ]);

      expect(result).toBe(false);
    });

    it('should return true for admin with any permission requirement', () => {
      const result = hasAnyPermission(UserRole.ADMIN, [
        Permission.SYSTEM_CONFIG,
        Permission.VIEW_LOGS,
      ]);

      expect(result).toBe(true);
    });

    it('should handle empty permissions array', () => {
      const result = hasAnyPermission(UserRole.VIEWER, []);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      const result = hasAllPermissions(UserRole.HR_MANAGER, [
        Permission.READ_JOB,
        Permission.CREATE_JOB,
        Permission.UPDATE_JOB,
      ]);

      expect(result).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      const result = hasAllPermissions(UserRole.VIEWER, [
        Permission.READ_JOB,
        Permission.CREATE_JOB,
      ]);

      expect(result).toBe(false);
    });

    it('should return true for admin with all permissions', () => {
      const result = hasAllPermissions(UserRole.ADMIN, [
        Permission.DELETE_USER,
        Permission.SYSTEM_CONFIG,
        Permission.MANAGE_INTEGRATIONS,
      ]);

      expect(result).toBe(true);
    });

    it('should handle empty permissions array', () => {
      const result = hasAllPermissions(UserRole.VIEWER, []);

      expect(result).toBe(true);
    });
  });

  describe('RequiredPermissions class', () => {
    it('should store permissions', () => {
      const required = new RequiredPermissions([
        Permission.READ_JOB,
        Permission.CREATE_JOB,
      ]);

      expect(required.permissions).toContain(Permission.READ_JOB);
      expect(required.permissions).toContain(Permission.CREATE_JOB);
    });

    it('should allow empty permissions', () => {
      const required = new RequiredPermissions([]);

      expect(required.permissions).toEqual([]);
    });
  });
});
