import { UserRole } from './user.dto';

export enum Permission {
  // Job Management
  CREATE_JOB = 'create_job',
  READ_JOB = 'read_job',
  UPDATE_JOB = 'update_job',
  DELETE_JOB = 'delete_job',

  // Resume Management
  UPLOAD_RESUME = 'upload_resume',
  PROCESS_RESUME = 'process_resume',
  READ_RESUME = 'read_resume',
  DELETE_RESUME = 'delete_resume',
  SEARCH_RESUME = 'search_resume',

  // Analysis & Reports
  READ_ANALYSIS = 'read_analysis',
  GENERATE_REPORT = 'generate_report',

  // Questionnaire Management
  CREATE_QUESTIONNAIRE = 'create_questionnaire',
  READ_QUESTIONNAIRE = 'read_questionnaire',
  UPDATE_QUESTIONNAIRE = 'update_questionnaire',
  DELETE_QUESTIONNAIRE = 'delete_questionnaire',
  PUBLISH_QUESTIONNAIRE = 'publish_questionnaire',
  READ_QUESTIONNAIRE_RESPONSES = 'read_questionnaire_responses',
  READ_QUESTIONNAIRE_ANALYTICS = 'read_questionnaire_analytics',
  EXPORT_QUESTIONNAIRE_DATA = 'export_questionnaire_data',

  // Usage Limit Management
  MANAGE_QUOTAS = 'manage_quotas',
  READ_USAGE_LIMITS = 'read_usage_limits',
  READ_USAGE_DETAILS = 'read_usage_details',
  MANAGE_USAGE_POLICY = 'manage_usage_policy',

  // User Management
  CREATE_USER = 'create_user',
  READ_USER = 'read_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  MANAGE_USER = 'manage_user',

  // Organization Management
  READ_ORGANIZATION = 'read_organization',
  UPDATE_ORGANIZATION = 'update_organization',

  // System Administration
  SYSTEM_CONFIG = 'system_config',
  VIEW_LOGS = 'view_logs',
  MANAGE_INTEGRATIONS = 'manage_integrations',
  ADMIN = 'admin',

  // Analytics & Metrics
  TRACK_METRICS = 'track_metrics',
  VIEW_ANALYTICS = 'view_analytics',
  READ_ANALYTICS = 'read_analytics',

  // Incentive Management
  VALIDATE_INCENTIVE = 'validate_incentive',
  APPROVE_INCENTIVE = 'approve_incentive',
  REJECT_INCENTIVE = 'reject_incentive',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // Full system access
    ...Object.values(Permission),
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
    Permission.MANAGE_USER,
    Permission.READ_ORGANIZATION,
    Permission.UPDATE_ORGANIZATION,
    Permission.TRACK_METRICS,
    Permission.VIEW_ANALYTICS,
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
    Permission.READ_ORGANIZATION,
    Permission.VIEW_ANALYTICS,
  ],
  [UserRole.VIEWER]: [
    // Read-only access
    Permission.READ_JOB,
    Permission.READ_RESUME,
    Permission.READ_ANALYSIS,
    Permission.READ_USER,
    Permission.READ_ORGANIZATION,
    Permission.VIEW_ANALYTICS,
  ],
};

/**
 * Represents the required permissions.
 */
export class RequiredPermissions {
  /**
   * Initializes a new instance of the Required Permissions.
   * @param permissions - The permissions.
   */
  constructor(public permissions: Permission[]) {}
}

/**
 * Performs the has permission operation.
 * @param userRole - The user role.
 * @param requiredPermission - The required permission.
 * @returns The boolean value.
 */
export function hasPermission(
  userRole: UserRole,
  requiredPermission: Permission,
): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(requiredPermission) || false;
}

/**
 * Performs the has any permission operation.
 * @param userRole - The user role.
 * @param requiredPermissions - The required permissions.
 * @returns The boolean value.
 */
export function hasAnyPermission(
  userRole: UserRole,
  requiredPermissions: Permission[],
): boolean {
  return requiredPermissions.some((permission) =>
    hasPermission(userRole, permission),
  );
}

/**
 * Performs the has all permissions operation.
 * @param userRole - The user role.
 * @param requiredPermissions - The required permissions.
 * @returns The boolean value.
 */
export function hasAllPermissions(
  userRole: UserRole,
  requiredPermissions: Permission[],
): boolean {
  return requiredPermissions.every((permission) =>
    hasPermission(userRole, permission),
  );
}
