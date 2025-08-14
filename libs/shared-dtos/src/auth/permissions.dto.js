"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequiredPermissions = exports.ROLE_PERMISSIONS = exports.Permission = void 0;
exports.hasPermission = hasPermission;
exports.hasAnyPermission = hasAnyPermission;
exports.hasAllPermissions = hasAllPermissions;
const user_dto_1 = require("./user.dto");
var Permission;
(function (Permission) {
    // Job Management
    Permission["CREATE_JOB"] = "create_job";
    Permission["READ_JOB"] = "read_job";
    Permission["UPDATE_JOB"] = "update_job";
    Permission["DELETE_JOB"] = "delete_job";
    // Resume Management
    Permission["UPLOAD_RESUME"] = "upload_resume";
    Permission["READ_RESUME"] = "read_resume";
    Permission["DELETE_RESUME"] = "delete_resume";
    // Analysis & Reports
    Permission["READ_ANALYSIS"] = "read_analysis";
    Permission["GENERATE_REPORT"] = "generate_report";
    // User Management
    Permission["CREATE_USER"] = "create_user";
    Permission["READ_USER"] = "read_user";
    Permission["UPDATE_USER"] = "update_user";
    Permission["DELETE_USER"] = "delete_user";
    Permission["MANAGE_USER"] = "manage_user";
    // Organization Management
    Permission["READ_ORGANIZATION"] = "read_organization";
    Permission["UPDATE_ORGANIZATION"] = "update_organization";
    // System Administration
    Permission["SYSTEM_CONFIG"] = "system_config";
    Permission["VIEW_LOGS"] = "view_logs";
    Permission["MANAGE_INTEGRATIONS"] = "manage_integrations";
    // Analytics & Metrics
    Permission["TRACK_METRICS"] = "track_metrics";
    Permission["VIEW_ANALYTICS"] = "view_analytics";
})(Permission || (exports.Permission = Permission = {}));
exports.ROLE_PERMISSIONS = {
    [user_dto_1.UserRole.ADMIN]: [
        // Full system access
        ...Object.values(Permission)
    ],
    [user_dto_1.UserRole.HR_MANAGER]: [
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
        Permission.VIEW_ANALYTICS
    ],
    [user_dto_1.UserRole.RECRUITER]: [
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
        Permission.VIEW_ANALYTICS
    ],
    [user_dto_1.UserRole.VIEWER]: [
        // Read-only access
        Permission.READ_JOB,
        Permission.READ_RESUME,
        Permission.READ_ANALYSIS,
        Permission.READ_USER,
        Permission.READ_ORGANIZATION,
        Permission.VIEW_ANALYTICS
    ]
};
class RequiredPermissions {
    constructor(permissions) {
        this.permissions = permissions;
    }
}
exports.RequiredPermissions = RequiredPermissions;
function hasPermission(userRole, requiredPermission) {
    return exports.ROLE_PERMISSIONS[userRole]?.includes(requiredPermission) || false;
}
function hasAnyPermission(userRole, requiredPermissions) {
    return requiredPermissions.some(permission => hasPermission(userRole, permission));
}
function hasAllPermissions(userRole, requiredPermissions) {
    return requiredPermissions.every(permission => hasPermission(userRole, permission));
}
