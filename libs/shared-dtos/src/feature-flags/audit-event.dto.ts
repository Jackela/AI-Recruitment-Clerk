export interface AuditEventDto {
  id?: string;
  actor: string;
  action: 'deploy' | 'rollout' | 'rollback' | 'flag-update' | 'threshold-update' | string;
  target: string;
  detail?: Record<string, unknown>;
  createdAt: string; // ISO timestamp
}

