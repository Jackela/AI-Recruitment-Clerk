import type { TableColumn } from '../../app/components/shared/data-table/data-table.component';

/**
 * Timesheet-specific table column configuration interface
 */
export interface TimesheetColumn extends TableColumn {
  /** Whether the column should be displayed in summary views */
  showInSummary?: boolean;
  /** Column validation rules for timesheet data */
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
  /** Format for displaying time values */
  timeFormat?: '12h' | '24h' | 'decimal';
  /** Whether column supports bulk editing */
  bulkEditable?: boolean;
}

/**
 * Timesheet table column configuration
 * Defines all columns for the timesheet table component
 */
export const TIMESHEET_COLUMNS: TimesheetColumn[] = [
  {
    key: 'date',
    label: '日期',
    mobileLabel: '日期',
    type: 'date',
    sortable: true,
    filterable: true,
    width: '120px',
    align: 'center',
    priority: 'high',
    showInSummary: true,
    validation: {
      required: true,
    },
    bulkEditable: false,
  },
  {
    key: 'project',
    label: '项目名称',
    mobileLabel: '项目',
    type: 'text',
    sortable: true,
    filterable: true,
    width: '200px',
    align: 'left',
    priority: 'high',
    truncateLength: 30,
    showInSummary: true,
    validation: {
      required: true,
    },
    bulkEditable: true,
  },
  {
    key: 'task',
    label: '任务描述',
    mobileLabel: '任务',
    type: 'text',
    sortable: false,
    filterable: true,
    width: '250px',
    align: 'left',
    priority: 'medium',
    truncateLength: 40,
    showInSummary: false,
    validation: {
      required: true,
    },
    bulkEditable: false,
  },
  {
    key: 'startTime',
    label: '开始时间',
    mobileLabel: '开始',
    type: 'text',
    sortable: true,
    filterable: false,
    width: '100px',
    align: 'center',
    priority: 'medium',
    timeFormat: '24h',
    showInSummary: false,
    validation: {
      required: true,
      pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
    },
    bulkEditable: false,
  },
  {
    key: 'endTime',
    label: '结束时间',
    mobileLabel: '结束',
    type: 'text',
    sortable: true,
    filterable: false,
    width: '100px',
    align: 'center',
    priority: 'medium',
    timeFormat: '24h',
    showInSummary: false,
    validation: {
      required: true,
      pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
    },
    bulkEditable: false,
  },
  {
    key: 'duration',
    label: '工作时长',
    mobileLabel: '时长',
    type: 'number',
    sortable: true,
    filterable: true,
    width: '100px',
    align: 'center',
    priority: 'high',
    timeFormat: 'decimal',
    showInSummary: true,
    validation: {
      required: true,
      min: 0.1,
      max: 24,
    },
    bulkEditable: false,
  },
  {
    key: 'category',
    label: '工作类别',
    mobileLabel: '类别',
    type: 'text',
    sortable: true,
    filterable: true,
    width: '120px',
    align: 'center',
    priority: 'medium',
    showInSummary: true,
    validation: {
      required: true,
    },
    bulkEditable: true,
  },
  {
    key: 'billable',
    label: '可计费',
    mobileLabel: '计费',
    type: 'boolean',
    sortable: true,
    filterable: true,
    width: '80px',
    align: 'center',
    priority: 'medium',
    showInSummary: true,
    bulkEditable: true,
  },
  {
    key: 'status',
    label: '状态',
    mobileLabel: '状态',
    type: 'text',
    sortable: true,
    filterable: true,
    width: '100px',
    align: 'center',
    priority: 'low',
    showInSummary: false,
    validation: {
      required: true,
    },
    bulkEditable: true,
  },
  {
    key: 'notes',
    label: '备注',
    mobileLabel: '备注',
    type: 'text',
    sortable: false,
    filterable: true,
    width: '200px',
    align: 'left',
    priority: 'low',
    truncateLength: 50,
    showInSummary: false,
    bulkEditable: false,
  },
];

/**
 * Configuration for different timesheet table views
 */
export const TIMESHEET_VIEW_CONFIGS = {
  /** Full detailed view with all columns */
  full: {
    columns: TIMESHEET_COLUMNS,
    options: {
      pageSize: 25,
      pageSizeOptions: [10, 25, 50, 100],
      showPagination: true,
      showFilter: true,
      showExport: true,
      selectable: true,
      multiSelect: true,
      striped: true,
      bordered: true,
      hoverable: true,
      loading: false,
      emptyMessage: '暂无工时记录',
    },
  },
  
  /** Summary view with only essential columns */
  summary: {
    columns: TIMESHEET_COLUMNS.filter(col => col.showInSummary),
    options: {
      pageSize: 50,
      pageSizeOptions: [25, 50, 100],
      showPagination: true,
      showFilter: true,
      showExport: true,
      selectable: false,
      multiSelect: false,
      striped: true,
      bordered: false,
      hoverable: true,
      loading: false,
      emptyMessage: '暂无工时摘要',
    },
  },
  
  /** Mobile optimized view */
  mobile: {
    columns: TIMESHEET_COLUMNS.filter(col => col.priority === 'high').map(col => ({
      ...col,
      label: col.mobileLabel || col.label,
      truncateLength: col.truncateLength ? Math.floor(col.truncateLength * 0.7) : undefined,
    })),
    options: {
      pageSize: 15,
      pageSizeOptions: [10, 15, 25],
      showPagination: true,
      showFilter: false,
      showExport: false,
      selectable: false,
      multiSelect: false,
      striped: true,
      bordered: false,
      hoverable: false,
      loading: false,
      emptyMessage: '暂无数据',
    },
  },
  
  /** Bulk edit view with editable columns only */
  bulkEdit: {
    columns: TIMESHEET_COLUMNS.filter(col => col.bulkEditable || col.key === 'date'),
    options: {
      pageSize: 25,
      pageSizeOptions: [10, 25, 50],
      showPagination: true,
      showFilter: true,
      showExport: false,
      selectable: true,
      multiSelect: true,
      striped: true,
      bordered: true,
      hoverable: true,
      loading: false,
      emptyMessage: '暂无可编辑的工时记录',
    },
  },
} as const;

/**
 * Responsive breakpoints for table display
 */
export const TIMESHEET_BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200,
} as const;

/**
 * Column visibility rules based on screen size
 */
export const RESPONSIVE_COLUMN_RULES = {
  mobile: (column: TimesheetColumn) => column.priority === 'high',
  tablet: (column: TimesheetColumn) => column.priority !== 'low',
  desktop: () => true,
} as const;

/**
 * Helper function to get columns based on screen size
 */
export function getResponsiveColumns(screenWidth: number): TimesheetColumn[] {
  if (screenWidth <= TIMESHEET_BREAKPOINTS.mobile) {
    return TIMESHEET_COLUMNS.filter(RESPONSIVE_COLUMN_RULES.mobile);
  } else if (screenWidth <= TIMESHEET_BREAKPOINTS.tablet) {
    return TIMESHEET_COLUMNS.filter(RESPONSIVE_COLUMN_RULES.tablet);
  } else {
    return TIMESHEET_COLUMNS.filter(RESPONSIVE_COLUMN_RULES.desktop);
  }
}

/**
 * Helper function to get view configuration
 */
export function getViewConfig(viewType: keyof typeof TIMESHEET_VIEW_CONFIGS) {
  return TIMESHEET_VIEW_CONFIGS[viewType];
}