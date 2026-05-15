/** Empty State Action Interface */
export interface EmptyStateAction {
  /** 按钮标签翻译键 */
  label: string;
  /** 按钮图标名称 */
  icon?: string;
  /** 按钮样式变体 */
  variant?: 'primary' | 'secondary' | 'outline';
  /** 点击处理函数 */
  handler?: () => void;
}

/** Empty State Type */
export type EmptyStateType = 'default' | 'search' | 'error' | 'success';
