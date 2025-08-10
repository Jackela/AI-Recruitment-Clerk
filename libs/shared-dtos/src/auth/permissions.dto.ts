import { UserRole } from './user.dto';

export enum Permission {
  // Job Management
  CREATE_JOB = 'create_job',
  READ_JOB = 'read_job',
  UPDATE_JOB = 'update_job',
  DELETE_JOB = 'delete_job',
  
  // Resume Management
  UPLOAD_RESUME = 'upload_resume',
  READ_RESUME = 'read_resume',
  DELETE_RESUME = 'delete_resume',
  
  // Analysis & Reports
  READ_ANALYSIS = 'read_analysis',
  GENERATE_REPORT = 'generate_report',
  
  // User Management
  CREATE_USER = 'create_user',
  READ_USER = 'read_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  
  // Organization Management
  READ_ORGANIZATION = 'read_organization',
  UPDATE_ORGANIZATION = 'update_organization',
  
  // System Administration
  SYSTEM_CONFIG = 'system_config',
  VIEW_LOGS = 'view_logs',
  MANAGE_INTEGRATIONS = 'manage_integrations'
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full system access
    ...Object.values(Permission)
  ],
  [UserRole.HR_MANAGER]: [
    // Job and user management
    Permission.CREATE_JOB,
    Permission.READ_JOB,
    Permission.UPDATE_JOB,
    Permission.DELETE_JOB,
    Permission.UPLOAD_RESUME,
    Permission.READ_RESUME,
    Permission.DELETE_RESUME,
    Permission.READ_ANALYSIS,
    Permission.GENERATE_REPORT,
    Permission.CREATE_USER,
    Permission.READ_USER,
    Permission.UPDATE_USER,
    Permission.READ_ORGANIZATION,
    Permission.UPDATE_ORGANIZATION
  ],
  [UserRole.RECRUITER]: [
    // Job and resume management
    Permission.CREATE_JOB,
    Permission.READ_JOB,
    Permission.UPDATE_JOB,
    Permission.UPLOAD_RESUME,
    Permission.READ_RESUME,
    Permission.READ_ANALYSIS,
    Permission.GENERATE_REPORT,
    Permission.READ_USER,
    Permission.READ_ORGANIZATION
  ],
  [UserRole.VIEWER]: [
    // Read-only access
    Permission.READ_JOB,
    Permission.READ_RESUME,
    Permission.READ_ANALYSIS,
    Permission.READ_USER,
    Permission.READ_ORGANIZATION
  ]
};

export class RequiredPermissions {
  constructor(public permissions: Permission[]) {}
}

export function hasPermission(userRole: UserRole, requiredPermission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(requiredPermission) || false;
}

export function hasAnyPermission(userRole: UserRole, requiredPermissions: Permission[]): boolean {
  return requiredPermissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(userRole: UserRole, requiredPermissions: Permission[]): boolean {
  return requiredPermissions.every(permission => hasPermission(userRole, permission));
}