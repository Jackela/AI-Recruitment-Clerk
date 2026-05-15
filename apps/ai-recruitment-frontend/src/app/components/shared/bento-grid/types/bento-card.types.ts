export interface BentoCardData {
  title: string;
  subtitle?: string;
  value?: string | number;
  icon?: string;
  badge?: string;
  progress?: BentoProgressData;
  metrics?: BentoMetricData[];
  actions?: BentoActionData[];
  status?: BentoStatus;
}

export interface BentoProgressData {
  value: number;
  max: number;
  label?: string;
}

export interface BentoMetricData {
  label: string;
  value: string | number;
  trend?: BentoTrendData;
}

export interface BentoTrendData {
  type: 'up' | 'down' | 'neutral';
  value: string;
}

export interface BentoActionData {
  label: string;
  icon?: string;
  primary?: boolean;
  onClick: () => void;
}

export type BentoStatus =
  | 'active'
  | 'inactive'
  | 'warning'
  | 'error'
  | 'success';

export type BentoIconName =
  | 'stats'
  | 'users'
  | 'trend-up'
  | 'clock'
  | 'target'
  | 'dashboard'
  | 'jobs'
  | 'resumes'
  | 'reports'
  | 'matches'
  | 'analytics'
  | 'activity'
  | 'settings';
export type ActionIconName = 'plus' | 'eye' | 'edit' | 'download' | 'arrow';
export type TrendType = 'up' | 'down' | 'neutral';
