/**
 * 国际化文本配置
 * 移除硬编码文本，实现多语言支持
 */

export const I18N_TEXTS = {
  // 通用文本
  COMMON: {
    loading: '加载中...',
    error: '出现错误',
    success: '成功',
    warning: '警告',
    info: '信息',
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    close: '关闭',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    submit: '提交',
    refresh: '刷新',
    search: '搜索',
    filter: '筛选',
    clear: '清除',
    reset: '重置',
  },

  // 应用程序标题和标签
  APP: {
    title: 'AI 招聘助理',
    description: 'AI Recruitment Assistant Application',

    // 导航菜单
    navigation: {
      dashboard: '仪表板',
      analysis: '智能分析',
      results: '分析结果',
      jobs: '职位管理',
      reports: '报告中心',
      settings: '设置',
      help: '帮助',
    },

    // 页面标题
    pages: {
      dashboard: {
        title: '仪表板',
        subtitle: '查看系统概览和统计信息',
      },
      analysis: {
        title: '智能分析',
        subtitle: 'AI驱动的简历和职位分析',
      },
      results: {
        title: '分析结果',
        subtitle: '查看详细的分析报告',
      },
    },

    // 欢迎信息
    welcome: {
      title: '欢迎使用AI招聘助手！',
      message: '点击右上角的帮助按钮查看使用指南，或按 Alt+H 显示快捷键帮助',
    },
  },

  // 可访问性相关文本
  ACCESSIBILITY: {
    // ARIA 标签
    aria: {
      menu: '主导航菜单',
      search: '搜索功能',
      settings: '可访问性和系统设置',
      notifications: '状态通知区域',
      main: '主要内容区域',
      banner: '页面横幅',
      complementary: '补充信息',
      contentinfo: '页面信息',
      guideOverlay: '应用程序引导覆盖层',
    },

    // 屏幕阅读器文本
    screenReader: {
      skipToContent: '跳转到主要内容',
      applicationLoaded:
        'AI Recruitment Assistant application loaded and ready for use',
      navigationHelp: '使用方向键导航菜单项',
      loading: 'Loading page content...',
      error: '加载失败，请稍后重试',
      keyboardHelpOpened: 'Keyboard shortcuts help opened',
      keyboardHelpClosed: 'Keyboard shortcuts help closed',
      settingsMenuOpened: 'Accessibility settings menu opened',
      settingsMenuClosed: 'Accessibility settings menu closed',
      navigatingTo: 'Navigating to {route} page',
    },

    // 键盘快捷键
    shortcuts: {
      dashboard: '跳转至仪表板',
      analysis: '跳转至智能分析',
      results: '跳转至分析结果',
      help: '显示键盘快捷键帮助',
      refresh: 'Refresh data - Ctrl+Shift+R',
      newAnalysis: 'New analysis - Ctrl+N',
      closeModal: 'Close modals - Escape',
    },

    // 可访问性功能
    keyboardShortcuts: '键盘快捷键',
    navigation: '导航',
    actions: '操作',
    toggleHighContrast: '切换高对比度',
    reduceMotion: '减少动画',
    increaseFontSize: '增大字体',
  },

  // 通知消息
  NOTIFICATIONS: {
    // 成功消息
    success: {
      dataRefreshed: '数据已更新',
      analysisCompleted: '分析完成',
      settingsSaved: '设置已保存',
      uploadSuccessful: '上传成功',
    },

    // 错误消息
    errors: {
      networkError: '网络连接失败，请检查网络设置',
      uploadFailed: '文件上传失败，请重试',
      analysisError: '分析过程中出现错误',
      saveError: '保存失败，请重试',
      loadError: '加载失败，请刷新页面',
    },

    // 警告消息
    warnings: {
      highErrorRate: '当前系统错误率较高，可能影响分析速度',
      connectionUnstable: '连接不稳定，正在尝试重连',
      unsavedChanges: '您有未保存的更改，确定要离开吗？',
    },

    // 信息消息
    info: {
      offlineMode: '正在使用离线模式，统计数据可能不是最新的',
      welcomeMessage: '欢迎使用AI招聘助手！',
      helpHint: '点击右上角的帮助按钮查看使用指南，或按 Alt+H 显示快捷键帮助',
      firstTimeUser: '首次使用该功能，建议先阅读使用说明',
    },
  },

  // 表单相关
  FORMS: {
    labels: {
      name: '姓名',
      email: '邮箱',
      phone: '电话',
      position: '职位',
      company: '公司',
      experience: '工作经验',
      skills: '技能',
      resume: '简历',
      jobDescription: '职位描述',
    },

    placeholders: {
      enterName: '请输入姓名',
      enterEmail: '请输入邮箱地址',
      selectPosition: '请选择职位',
      uploadFile: '点击上传文件或拖拽文件到此处',
      searchJobs: '搜索职位...',
    },

    validation: {
      required: '此字段为必填项',
      invalidEmail: '请输入有效的邮箱地址',
      invalidPhone: '请输入有效的电话号码',
      fileSizeError: '文件大小不能超过 {size}MB',
      fileTypeError: '不支持的文件类型',
    },
  },

  // 状态文本
  STATUSES: {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
  },

  // 时间相关
  TIME: {
    now: '刚刚',
    minutesAgo: '{minutes} 分钟前',
    hoursAgo: '{hours} 小时前',
    daysAgo: '{days} 天前',
    weeksAgo: '{weeks} 周前',
    monthsAgo: '{months} 个月前',
    yearsAgo: '{years} 年前',
  },
} as const;

// 类型定义
export type I18nTexts = typeof I18N_TEXTS;

// 文本获取工具函数
export function getText(path: string): string {
  const keys = path.split('.');
  let value: any = I18N_TEXTS;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      console.warn(`Translation key not found: ${path}`);
      return path; // 返回路径作为备用文本
    }
  }

  return typeof value === 'string' ? value : path;
}

// 带参数的文本插值
export function getTextWithParams(
  path: string,
  params: Record<string, any>,
): string {
  let text = getText(path);

  for (const [key, value] of Object.entries(params)) {
    text = text.replace(`{${key}}`, String(value));
  }

  return text;
}
