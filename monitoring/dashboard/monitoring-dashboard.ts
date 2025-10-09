/**
 * Monitoring Dashboard System
 * Real-time monitoring dashboard with multiple views and customizable widgets
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

// Enhanced type definitions for dashboard widgets
export type FilterValue = string | number | boolean | string[] | number[];
export type WidgetDataValue = number | string | boolean | Date | null;
export type TimeSeriesDataPoint = {
  timestamp: Date;
  value: WidgetDataValue;
  [key: string]: WidgetDataValue;
};

export type ChartDataset = {
  label: string;
  data: Array<{ x: Date; y: number }>;
  borderColor: string;
  backgroundColor: string;
};

export type ChartData = {
  datasets: ChartDataset[];
};

export type GaugeData = {
  value: number;
  max: number;
  thresholds: Array<{
    value: number;
    color: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
  }>;
};

export type TableData = {
  columns: string[];
  rows: Record<string, WidgetDataValue>[];
};

export type MetricData = {
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  status: 'normal' | 'warning' | 'critical';
};

export type WidgetData = ChartData | GaugeData | TableData | MetricData | TimeSeriesDataPoint | TimeSeriesDataPoint[] | number | string;

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'status' | 'alert' | 'log' | 'map' | 'gauge' | 'table';
  title: string;
  description?: string;
  position: { x: number; y: number; width: number; height: number };
  config: {
    dataSource: string;
    metric?: string;
    timeRange?: string;
    refreshInterval?: number;
    visualization?: {
      chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
      colorScheme?: string[];
      showLegend?: boolean;
      showGrid?: boolean;
    };
    thresholds?: Array<{
      value: number;
      color: string;
      operator: '>' | '<' | '=' | '>=' | '<=';
    }>;
    filters?: Record<string, FilterValue>;
  };
  data?: WidgetData;
  lastUpdated?: Date;
  status: 'active' | 'loading' | 'error' | 'disabled';
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  category: 'overview' | 'system' | 'application' | 'business' | 'security' | 'custom';
  widgets: DashboardWidget[];
  layout: {
    columns: number;
    rows: number;
    autoResize: boolean;
  };
  permissions: {
    view: string[];
    edit: string[];
  };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardData {
  timestamp: Date;
  systemMetrics: {
    cpu: { usage: number; cores: number; loadAverage: number[] };
    memory: { total: number; used: number; free: number; usage: number };
    disk: { total: number; used: number; free: number; usage: number };
    network: { connections: number; throughput: number };
  };
  applicationMetrics: {
    uptime: number;
    requestsPerSecond: number;
    errorRate: number;
    responseTime: number;
    activeUsers: number;
    databaseConnections: number;
  };
  businessMetrics: {
    totalResumes: number;
    totalJobs: number;
    successfulMatches: number;
    conversionRate: number;
    userSatisfaction: number;
  };
  securityMetrics: {
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    securityEvents: number;
    blockedRequests: number;
    suspiciousActivities: number;
  };
  alertsSummary: {
    total: number;
    critical: number;
    active: number;
    resolved: number;
  };
}

@Injectable()
export class MonitoringDashboardService {
  private readonly logger = new Logger(MonitoringDashboardService.name);
  
  private dashboards = new Map<string, Dashboard>();
  private widgetData = new Map<string, WidgetData>();
  private dashboardData: DashboardData | null = null;
  
  private readonly dataSources = new Map<string, () => Promise<WidgetData>>();

  constructor() {
    this.initializeDataSources();
    this.createDefaultDashboards();
    this.logger.log('📊 Monitoring Dashboard initialized');
  }

  /**
   * Get all dashboards
   */
  getDashboards(category?: Dashboard['category']): Dashboard[] {
    let dashboards = Array.from(this.dashboards.values());
    
    if (category) {
      dashboards = dashboards.filter(d => d.category === category);
    }
    
    return dashboards.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get specific dashboard
   */
  getDashboard(dashboardId: string): Dashboard | null {
    return this.dashboards.get(dashboardId) || null;
  }

  /**
   * Create new dashboard
   */
  createDashboard(dashboardData: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Dashboard {
    const dashboard: Dashboard = {
      id: this.generateId('dashboard'),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...dashboardData,
    };

    this.dashboards.set(dashboard.id, dashboard);
    this.logger.log(`📊 Created dashboard: ${dashboard.name}`);
    
    return dashboard;
  }

  /**
   * Update dashboard
   */
  updateDashboard(dashboardId: string, updates: Partial<Dashboard>): Dashboard | null {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    Object.assign(dashboard, { ...updates, updatedAt: new Date() });
    this.dashboards.set(dashboardId, dashboard);
    
    return dashboard;
  }

  /**
   * Add widget to dashboard
   */
  addWidget(dashboardId: string, widgetData: Omit<DashboardWidget, 'id' | 'lastUpdated' | 'status'>): DashboardWidget | null {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const widget: DashboardWidget = {
      id: this.generateId('widget'),
      lastUpdated: new Date(),
      status: 'active',
      ...widgetData,
    };

    dashboard.widgets.push(widget);
    dashboard.updatedAt = new Date();
    
    // Initialize widget data
    this.updateWidgetData(widget);
    
    this.logger.debug(`➕ Added widget to dashboard ${dashboardId}: ${widget.title}`);
    return widget;
  }

  /**
   * Update widget
   */
  updateWidget(dashboardId: string, widgetId: string, updates: Partial<DashboardWidget>): DashboardWidget | null {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return null;

    const widget = dashboard.widgets[widgetIndex];
    Object.assign(widget, { ...updates, lastUpdated: new Date() });
    dashboard.updatedAt = new Date();
    
    return widget;
  }

  /**
   * Remove widget from dashboard
   */
  removeWidget(dashboardId: string, widgetId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    const widgetIndex = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return false;

    dashboard.widgets.splice(widgetIndex, 1);
    dashboard.updatedAt = new Date();
    this.widgetData.delete(widgetId);
    
    this.logger.debug(`➖ Removed widget from dashboard ${dashboardId}: ${widgetId}`);
    return true;
  }

  /**
   * Get dashboard data for real-time updates
   */
  async getDashboardData(): Promise<DashboardData> {
    if (!this.dashboardData) {
      await this.refreshDashboardData();
    }
    return this.dashboardData!;
  }

  /**
   * Get widget data
   */
  getWidgetData(widgetId: string): WidgetData | undefined {
    return this.widgetData.get(widgetId);
  }

  /**
   * Export dashboard configuration
   */
  exportDashboard(dashboardId: string): DashboardExport | null {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    return {
      version: '1.0',
      exported: new Date().toISOString(),
      dashboard: {
        ...dashboard,
        id: undefined, // Remove ID for import
      },
    };
  }

  /**
   * Import dashboard configuration
   */
  importDashboard(dashboardConfig: DashboardExport): Dashboard | null {
    try {
      const { dashboard } = dashboardConfig;
      return this.createDashboard(dashboard);
    } catch (error) {
      this.logger.error('Failed to import dashboard:', error);
      return null;
    }
  }

  /**
   * Refresh dashboard data every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async refreshDashboardData(): Promise<void> {
    try {
      // Collect data from all sources
      const [systemMetrics, applicationMetrics, businessMetrics, securityMetrics, alertsSummary] = await Promise.all([
        this.getSystemMetrics(),
        this.getApplicationMetrics(),
        this.getBusinessMetrics(),
        this.getSecurityMetrics(),
        this.getAlertsSummary(),
      ]);

      this.dashboardData = {
        timestamp: new Date(),
        systemMetrics,
        applicationMetrics,
        businessMetrics,
        securityMetrics,
        alertsSummary,
      };

      // Update all widget data
      await this.updateAllWidgetData();

    } catch (error) {
      this.logger.error('Failed to refresh dashboard data:', error);
    }
  }

  /**
   * Update widget data every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async updateAllWidgetData(): Promise<void> {
    const allWidgets = Array.from(this.dashboards.values())
      .flatMap(dashboard => dashboard.widgets)
      .filter(widget => widget.status === 'active');

    const updatePromises = allWidgets.map(widget => this.updateWidgetData(widget));
    await Promise.allSettled(updatePromises);
  }

  /**
   * Private helper methods
   */
  private async updateWidgetData(widget: DashboardWidget): Promise<void> {
    try {
      widget.status = 'loading';
      
      const dataSource = this.dataSources.get(widget.config.dataSource);
      if (!dataSource) {
        throw new Error(`Data source not found: ${widget.config.dataSource}`);
      }

      const rawData = await dataSource();
      const processedData = this.processWidgetData(widget, rawData);
      
      this.widgetData.set(widget.id, processedData);
      widget.data = processedData;
      widget.lastUpdated = new Date();
      widget.status = 'active';

    } catch (error) {
      this.logger.error(`Failed to update widget data for ${widget.id}:`, error);
      widget.status = 'error';
    }
  }

  private processWidgetData(widget: DashboardWidget, rawData: WidgetData): WidgetData {
    const { config } = widget;
    
    // Apply filters
    let data = rawData;
    if (config.filters) {
      data = this.applyFilters(data, config.filters);
    }

    // Extract specific metric if specified
    if (config.metric && data[config.metric] !== undefined) {
      data = data[config.metric];
    }

    // Apply time range filtering
    if (config.timeRange && Array.isArray(data)) {
      const timeRangeMs = this.parseTimeRange(config.timeRange);
      const cutoffTime = Date.now() - timeRangeMs;
      data = data.filter((item: TimeSeriesDataPoint) => 
        item.timestamp && new Date(item.timestamp).getTime() > cutoffTime
      );
    }

    // Process based on widget type
    switch (widget.type) {
      case 'chart':
        return this.processChartData(data, widget.config);
      case 'gauge':
        return this.processGaugeData(data, widget.config);
      case 'table':
        return this.processTableData(data, widget.config);
      case 'metric':
        return this.processMetricData(data, widget.config);
      default:
        return data;
    }
  }

  private processChartData(data: WidgetData, config: DashboardWidget['config']): ChartData {
    if (typeof data === 'number') {
      return {
        datasets: [{
          label: config.metric || 'Value',
          data: [{ x: new Date(), y: data }],
          borderColor: config.visualization?.colorScheme?.[0] || '#3b82f6',
          backgroundColor: config.visualization?.colorScheme?.[0] || '#3b82f6',
        }],
      };
    }

    if (Array.isArray(data)) {
      return {
        datasets: [{
          label: config.metric || 'Value',
          data: data.map(item => ({
            x: item.timestamp || new Date(),
            y: item.value || item,
          })),
          borderColor: config.visualization?.colorScheme?.[0] || '#3b82f6',
          backgroundColor: config.visualization?.colorScheme?.[0] || '#3b82f6',
        }],
      };
    }

    return data;
  }

  private processGaugeData(data: WidgetData, config: DashboardWidget['config']): GaugeData {
    const value = typeof data === 'number' ? data : data?.value || 0;
    const max = config.thresholds?.reduce((max, threshold) => Math.max(max, threshold.value), 100) || 100;
    
    return {
      value,
      max,
      thresholds: config.thresholds || [],
    };
  }

  private processTableData(data: WidgetData, config: DashboardWidget['config']): TableData {
    if (!Array.isArray(data)) {
      return { rows: [], columns: [] };
    }

    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    return {
      columns,
      rows: data.slice(0, 100), // Limit to 100 rows
    };
  }

  private processMetricData(data: WidgetData, config: DashboardWidget['config']): MetricData {
    const value = typeof data === 'number' ? data : data?.value || 0;
    const previousValue = data?.previousValue || value;
    const change = value - previousValue;
    const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0;

    return {
      value,
      previousValue,
      change,
      changePercent,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      status: this.getMetricStatus(value, config.thresholds),
    };
  }

  private getMetricStatus(value: number, thresholds?: DashboardWidget['config']['thresholds']): 'normal' | 'warning' | 'critical' {
    if (!thresholds) return 'normal';

    for (const threshold of thresholds) {
      let conditionMet = false;
      switch (threshold.operator) {
        case '>': conditionMet = value > threshold.value; break;
        case '<': conditionMet = value < threshold.value; break;
        case '>=': conditionMet = value >= threshold.value; break;
        case '<=': conditionMet = value <= threshold.value; break;
        case '=': conditionMet = value === threshold.value; break;
      }

      if (conditionMet) {
        if (threshold.color === 'red') return 'critical';
        if (threshold.color === 'yellow') return 'warning';
      }
    }

    return 'normal';
  }

  private applyFilters(data: WidgetData, filters: Record<string, FilterValue>): WidgetData {
    if (!Array.isArray(data)) return data;

    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        return item[key] === value;
      });
    });
  }

  private parseTimeRange(timeRange: string): number {
    const units = {
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
    };

    const match = timeRange.match(/^(\d+)([mhd])$/);
    if (!match) return 60 * 60 * 1000; // Default 1 hour

    const [, amount, unit] = match;
    return parseInt(amount) * (units[unit as keyof typeof units] || units.h);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDataSources(): void {
    // System metrics data source
    this.dataSources.set('system', async () => {
      return this.dashboardData?.systemMetrics || this.getSystemMetrics();
    });

    // Application metrics data source
    this.dataSources.set('application', async () => {
      return this.dashboardData?.applicationMetrics || this.getApplicationMetrics();
    });

    // Business metrics data source
    this.dataSources.set('business', async () => {
      return this.dashboardData?.businessMetrics || this.getBusinessMetrics();
    });

    // Security metrics data source
    this.dataSources.set('security', async () => {
      return this.dashboardData?.securityMetrics || this.getSecurityMetrics();
    });

    // Alerts data source
    this.dataSources.set('alerts', async () => {
      return this.dashboardData?.alertsSummary || this.getAlertsSummary();
    });
  }

  private async getSystemMetrics(): Promise<DashboardData['systemMetrics']> {
    // Mock system metrics - replace with actual system monitoring
    return {
      cpu: {
        usage: Math.random() * 30 + 20, // 20-50%
        cores: 8,
        loadAverage: [1.2, 1.5, 1.8],
      },
      memory: {
        total: 16 * 1024 * 1024 * 1024, // 16GB
        used: Math.random() * 8 * 1024 * 1024 * 1024 + 4 * 1024 * 1024 * 1024, // 4-12GB
        free: 0,
        usage: 0,
      },
      disk: {
        total: 500 * 1024 * 1024 * 1024, // 500GB
        used: Math.random() * 200 * 1024 * 1024 * 1024 + 100 * 1024 * 1024 * 1024, // 100-300GB
        free: 0,
        usage: 0,
      },
      network: {
        connections: Math.floor(Math.random() * 100) + 50,
        throughput: Math.random() * 1000 + 500, // Mbps
      },
    };
  }

  private async getApplicationMetrics(): Promise<DashboardData['applicationMetrics']> {
    return {
      uptime: Date.now() - (Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random uptime up to 7 days
      requestsPerSecond: Math.random() * 100 + 50,
      errorRate: Math.random() * 2, // 0-2%
      responseTime: Math.random() * 200 + 100, // 100-300ms
      activeUsers: Math.floor(Math.random() * 500) + 100,
      databaseConnections: Math.floor(Math.random() * 20) + 10,
    };
  }

  private async getBusinessMetrics(): Promise<DashboardData['businessMetrics']> {
    return {
      totalResumes: Math.floor(Math.random() * 1000) + 5000,
      totalJobs: Math.floor(Math.random() * 200) + 800,
      successfulMatches: Math.floor(Math.random() * 500) + 1000,
      conversionRate: Math.random() * 10 + 15, // 15-25%
      userSatisfaction: Math.random() * 1 + 4, // 4-5 stars
    };
  }

  private async getSecurityMetrics(): Promise<DashboardData['securityMetrics']> {
    const eventCount = Math.floor(Math.random() * 10);
    return {
      threatLevel: eventCount > 5 ? 'high' : eventCount > 2 ? 'medium' : 'low',
      securityEvents: eventCount,
      blockedRequests: Math.floor(Math.random() * 50),
      suspiciousActivities: Math.floor(Math.random() * 5),
    };
  }

  private async getAlertsSummary(): Promise<DashboardData['alertsSummary']> {
    const total = Math.floor(Math.random() * 20) + 5;
    const critical = Math.floor(Math.random() * 3);
    const resolved = Math.floor(Math.random() * (total - critical));
    
    return {
      total,
      critical,
      active: total - resolved,
      resolved,
    };
  }

  private createDefaultDashboards(): void {
    // System Overview Dashboard
    const systemDashboard = this.createDashboard({
      name: 'System Overview',
      description: 'Comprehensive system monitoring dashboard',
      category: 'overview',
      isDefault: true,
      widgets: [],
      layout: { columns: 12, rows: 8, autoResize: true },
      permissions: { view: ['*'], edit: ['admin'] },
    });

    // Add widgets to system dashboard
    this.addWidget(systemDashboard.id, {
      type: 'metric',
      title: 'CPU Usage',
      position: { x: 0, y: 0, width: 3, height: 2 },
      config: {
        dataSource: 'system',
        metric: 'cpu.usage',
        refreshInterval: 30,
        thresholds: [
          { value: 80, color: 'yellow', operator: '>' },
          { value: 90, color: 'red', operator: '>' },
        ],
      },
    });

    this.addWidget(systemDashboard.id, {
      type: 'chart',
      title: 'System Performance',
      position: { x: 3, y: 0, width: 6, height: 4 },
      config: {
        dataSource: 'system',
        timeRange: '1h',
        refreshInterval: 30,
        visualization: {
          chartType: 'line',
          showLegend: true,
          showGrid: true,
        },
      },
    });

    this.addWidget(systemDashboard.id, {
      type: 'gauge',
      title: 'Memory Usage',
      position: { x: 9, y: 0, width: 3, height: 2 },
      config: {
        dataSource: 'system',
        metric: 'memory.usage',
        refreshInterval: 30,
        thresholds: [
          { value: 70, color: 'yellow', operator: '>' },
          { value: 85, color: 'red', operator: '>' },
        ],
      },
    });

    // Business Metrics Dashboard
    const businessDashboard = this.createDashboard({
      name: 'Business Metrics',
      description: 'Key business performance indicators',
      category: 'business',
      isDefault: false,
      widgets: [],
      layout: { columns: 12, rows: 6, autoResize: true },
      permissions: { view: ['*'], edit: ['admin', 'manager'] },
    });

    this.addWidget(businessDashboard.id, {
      type: 'metric',
      title: 'Total Resumes',
      position: { x: 0, y: 0, width: 3, height: 2 },
      config: {
        dataSource: 'business',
        metric: 'totalResumes',
        refreshInterval: 60,
      },
    });

    this.addWidget(businessDashboard.id, {
      type: 'metric',
      title: 'Active Jobs',
      position: { x: 3, y: 0, width: 3, height: 2 },
      config: {
        dataSource: 'business',
        metric: 'totalJobs',
        refreshInterval: 60,
      },
    });

    this.addWidget(businessDashboard.id, {
      type: 'chart',
      title: 'Conversion Rate Trend',
      position: { x: 6, y: 0, width: 6, height: 4 },
      config: {
        dataSource: 'business',
        metric: 'conversionRate',
        timeRange: '24h',
        refreshInterval: 300,
        visualization: {
          chartType: 'area',
          colorScheme: ['#10b981'],
        },
      },
    });

    // Security Dashboard
    const securityDashboard = this.createDashboard({
      name: 'Security Monitoring',
      description: 'Real-time security threat monitoring',
      category: 'security',
      isDefault: false,
      widgets: [],
      layout: { columns: 12, rows: 6, autoResize: true },
      permissions: { view: ['admin', 'security'], edit: ['admin'] },
    });

    this.addWidget(securityDashboard.id, {
      type: 'status',
      title: 'Threat Level',
      position: { x: 0, y: 0, width: 4, height: 2 },
      config: {
        dataSource: 'security',
        metric: 'threatLevel',
        refreshInterval: 30,
      },
    });

    this.addWidget(securityDashboard.id, {
      type: 'metric',
      title: 'Security Events',
      position: { x: 4, y: 0, width: 4, height: 2 },
      config: {
        dataSource: 'security',
        metric: 'securityEvents',
        refreshInterval: 30,
      },
    });

    this.addWidget(securityDashboard.id, {
      type: 'metric',
      title: 'Blocked Requests',
      position: { x: 8, y: 0, width: 4, height: 2 },
      config: {
        dataSource: 'security',
        metric: 'blockedRequests',
        refreshInterval: 30,
      },
    });

    this.logger.log(`✅ Created ${this.dashboards.size} default dashboards`);
  }
}