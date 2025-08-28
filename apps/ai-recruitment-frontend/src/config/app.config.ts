/**
 * 应用程序配置文件
 * 用于管理所有硬编码的配置项和常量
 */

export const APP_CONFIG = {
  // 应用信息
  APP_INFO: {
    name: 'AI 招聘助理',
    version: '1.0.0',
    description: 'AI Recruitment Assistant Application',
  },

  // API 配置 - 生产环境使用相对路径
  API: {
    baseUrl: (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
    timeout: 30000,
    retryAttempts: 3,
  },

  // WebSocket 配置 - 生产环境使用相对路径
  WEBSOCKET: {
    url: (typeof window !== 'undefined' ? `ws://${window.location.host}` : 'ws://localhost:3000'),
    reconnectInterval: 3000,
    maxRetries: 5,
  },

  // 用户界面配置
  UI: {
    // 通知显示时长
    notificationDuration: {
      success: 4000,
      info: 6000,
      warning: 8000,
      error: 10000,
    },
    
    // 加载超时时间
    loadingTimeout: 30000,
    
    // 动画配置
    animations: {
      fadeInDuration: 300,
      slideInDuration: 250,
      modalTransition: 200,
    },

    // 分页配置
    pagination: {
      defaultPageSize: 20,
      pageSizeOptions: [10, 20, 50, 100],
    },

    // 时间配置
    TIMING: {
      animationDuration: 300,
      toastDuration: 5000,
      debounceDelay: 300,
      WELCOME_DELAY: 8000,
      INITIAL_DELAY: 2000
    },
  },

  // 可访问性配置
  ACCESSIBILITY: {
    // 焦点管理
    focusDelay: 100,
    announceDelay: 500,
    
    // 键盘导航
    keyboardNavigation: {
      skipLinkTarget: 'main-content',
      trapFocusOnModal: true,
    },
    
    // 屏幕阅读器
    screenReader: {
      liveRegionDelay: 100,
      assertiveDelay: 50,
    },
  },

  // 性能配置
  PERFORMANCE: {
    // 图片懒加载阈值
    lazyLoadThreshold: 300,
    
    // 防抖延迟
    debounceDelay: 300,
    
    // 缓存配置
    cache: {
      maxAge: 5 * 60 * 1000, // 5分钟
      maxItems: 100,
    },
  },

  // 错误处理配置
  ERROR_HANDLING: {
    // 错误重试配置
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
    },
    
    // 错误阈值
    errorThreshold: {
      maxErrorRate: 0.1, // 10%
      timeWindow: 60000, // 1分钟
    },
  },

  // 本地化配置
  LOCALIZATION: {
    defaultLocale: 'zh-CN',
    supportedLocales: ['zh-CN', 'en-US'],
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    currencyCode: 'CNY',
  },

  // 功能标志
  FEATURE_FLAGS: {
    enableRealTimeStats: true,
    enableAdvancedAnalytics: true,
    enablePWA: false,
    enableOfflineMode: false,
  },
} as const;

// 类型定义
export type AppConfig = typeof APP_CONFIG;