/**
 * Defines shape of progress message.
 */
export interface ProgressMessage {
  type: 'info' | 'success' | 'error' | 'progress';
  message: string;
  timestamp: Date;
}

/**
 * Defines shape of web socket progress message.
 */
export interface WebSocketProgressMessage {
  type: string;
  data?: {
    message?: string;
    currentStep?: string;
    [key: string]: unknown;
  };
}

/**
 * Defines shape of step change data.
 */
export interface StepChangeData {
  currentStep: string;
  message?: string;
  progress?: number;
}

/**
 * Defines shape of progress completion data.
 */
export interface ProgressCompletionData {
  progress?: number;
  message?: string;
  finalStep?: string;
}

/**
 * Defines shape of progress error data.
 */
export interface ProgressErrorData {
  error?: string;
  message?: string;
  code?: string | number;
}

/**
 * Defines shape of progress step.
 */
export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress?: number;
}
