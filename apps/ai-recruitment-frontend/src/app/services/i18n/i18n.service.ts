import { Injectable, signal, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, BehaviorSubject } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { ToastService } from '../toast.service';

export type Language = 'zh-CN' | 'en-US' | 'zh-TW' | 'ja-JP' | 'ko-KR';

/**
 * Defines the shape of the translation strings.
 */
export interface TranslationStrings {
  [key: string]: string | TranslationStrings;
}

export type TranslationParamValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;
export type TranslationParams = Record<string, TranslationParamValue>;

/**
 * Defines the shape of the language config.
 */
export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    currency: string;
  };
}

/**
 * Provides i18n functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class I18nService {
  private readonly STORAGE_KEY = 'app-language-preference';
  private readonly DEFAULT_LANGUAGE: Language = 'zh-CN';

  // Language configurations
  private readonly languages: Record<Language, LanguageConfig> = {
    'zh-CN': {
      code: 'zh-CN',
      name: 'Simplified Chinese',
      nativeName: '简体中文',
      direction: 'ltr',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      numberFormat: {
        decimal: '.',
        thousands: ',',
        currency: '¥',
      },
    },
    'en-US': {
      code: 'en-US',
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: 'h:mm:ss A',
      numberFormat: {
        decimal: '.',
        thousands: ',',
        currency: '$',
      },
    },
    'zh-TW': {
      code: 'zh-TW',
      name: 'Traditional Chinese',
      nativeName: '繁體中文',
      direction: 'ltr',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: 'HH:mm:ss',
      numberFormat: {
        decimal: '.',
        thousands: ',',
        currency: 'NT$',
      },
    },
    'ja-JP': {
      code: 'ja-JP',
      name: 'Japanese',
      nativeName: '日本語',
      direction: 'ltr',
      dateFormat: 'YYYY年MM月DD日',
      timeFormat: 'HH:mm:ss',
      numberFormat: {
        decimal: '.',
        thousands: ',',
        currency: '¥',
      },
    },
    'ko-KR': {
      code: 'ko-KR',
      name: 'Korean',
      nativeName: '한국어',
      direction: 'ltr',
      dateFormat: 'YYYY.MM.DD',
      timeFormat: 'HH:mm:ss',
      numberFormat: {
        decimal: '.',
        thousands: ',',
        currency: '₩',
      },
    },
  };

  // Reactive state
  currentLanguage = signal<Language>(this.DEFAULT_LANGUAGE);
  isLoading = signal(false);
  private translations = new BehaviorSubject<TranslationStrings>({});

  // Translation cache
  private translationCache = new Map<Language, TranslationStrings>();

  /**
   * Initializes a new instance of the I18n Service.
   * @param http - The http.
   * @param toastService - The toast service.
   */
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  constructor() {
    this.initializeLanguage();

    // Apply language changes reactively
    effect(() => {
      const lang = this.currentLanguage();
      this.applyLanguage(lang);
    });
  }

  private initializeLanguage(): void {
    // Get saved preference or detect from browser
    const savedLanguage = this.getSavedLanguage();
    const detectedLanguage = savedLanguage || this.detectBrowserLanguage();

    this.currentLanguage.set(detectedLanguage);
    this.loadTranslations(detectedLanguage);
  }

  private getSavedLanguage(): Language | null {
    const saved = localStorage.getItem(this.STORAGE_KEY) as Language;
    return saved && this.languages[saved] ? saved : null;
  }

  private detectBrowserLanguage(): Language {
    const browserLang = navigator.language || navigator.languages[0];

    // Try exact match first
    if (this.languages[browserLang as Language]) {
      return browserLang as Language;
    }

    // Try language code without region
    const langCode = browserLang.split('-')[0];
    const matchingLang = Object.keys(this.languages).find((key) =>
      key.startsWith(langCode),
    ) as Language;

    return matchingLang || this.DEFAULT_LANGUAGE;
  }

  private loadTranslations(language: Language): void {
    // Check cache first
    const cachedTranslations = this.translationCache.get(language);
    if (cachedTranslations) {
      this.translations.next(cachedTranslations);
      return;
    }

    const fallbackTranslations = this.getFallbackTranslations(language);
    // Seed with fallback to avoid blank keys before HTTP completes
    this.translations.next(fallbackTranslations);

    this.isLoading.set(true);

    // Load translation file
    this.http
      .get<TranslationStrings>(`/assets/i18n/${language}.json`)
      .pipe(
        catchError((error) => {
          console.error(`Failed to load translations for ${language}:`, error);
          this.toastService.warning('语言包加载失败，已使用内置翻译');
          return of(fallbackTranslations);
        }),
        tap((translations) => {
          this.translationCache.set(language, translations);
          this.translations.next(translations);
        }),
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe();
  }

  private applyLanguage(language: Language): void {
    const config = this.languages[language];

    // Set HTML lang attribute
    document.documentElement.lang = language;

    // Set text direction
    document.documentElement.dir = config.direction;

    // Apply language-specific styles
    document.documentElement.setAttribute('data-language', language);

    // Update meta tags
    this.updateMetaTags(language);
  }

  private updateMetaTags(language: Language): void {
    // Update content language meta tag
    let metaLang = document.querySelector(
      'meta[http-equiv="content-language"]',
    );
    if (!metaLang) {
      metaLang = document.createElement('meta');
      metaLang.setAttribute('http-equiv', 'content-language');
      document.head.appendChild(metaLang);
    }
    metaLang.setAttribute('content', language);

    // Update og:locale meta tag
    let metaOgLocale = document.querySelector('meta[property="og:locale"]');
    if (!metaOgLocale) {
      metaOgLocale = document.createElement('meta');
      metaOgLocale.setAttribute('property', 'og:locale');
      document.head.appendChild(metaOgLocale);
    }
    metaOgLocale.setAttribute('content', language.replace('-', '_'));
  }

  // Public API

  /**
   * Sets language.
   * @param language - The language.
   */
  setLanguage(language: Language): void {
    if (!this.languages[language]) {
      console.error(`Unsupported language: ${language}`);
      return;
    }

    this.currentLanguage.set(language);
    localStorage.setItem(this.STORAGE_KEY, language);
    this.loadTranslations(language);

    const config = this.languages[language];
    this.toastService.success(`语言已切换到${config.nativeName}`);
  }

  /**
   * Retrieves available languages.
   * @returns The an array of LanguageConfig.
   */
  getAvailableLanguages(): LanguageConfig[] {
    return Object.values(this.languages);
  }

  /**
   * Retrieves current language config.
   * @returns The LanguageConfig.
   */
  getCurrentLanguageConfig(): LanguageConfig {
    return this.languages[this.currentLanguage()];
  }

  /**
   * Performs the translate operation.
   * @param key - The key.
   * @param params - The params.
   * @returns The string value.
   */
  translate(key: string, params?: TranslationParams): string {
    const translations = this.translations.value;
    const keys = key.split('.');
    let value: string | TranslationStrings | undefined = translations;

    for (const segment of keys) {
      if (typeof value === 'string') {
        break;
      }

      value = value?.[segment] as string | TranslationStrings | undefined;

      if (value === undefined) {
        break;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation not found for key: ${key}`);
      return key;
    }

    if (!params) {
      return value;
    }

    return Object.entries(params).reduce((acc, [param, paramValue]) => {
      return acc.replace(new RegExp(`{{${param}}}`, 'g'), String(paramValue));
    }, value);
  }

  // Shorthand
  /**
   * Performs the t operation.
   * @param key - The key.
   * @param params - The params.
   * @returns The string value.
   */
  t(key: string, params?: TranslationParams): string {
    return this.translate(key, params);
  }

  // Format methods

  /**
   * Performs the format date operation.
   * @param date - The date.
   * @param _format - The format.
   * @returns The string value.
   */
  formatDate(date: Date | string, _format?: string): string {
    const config = this.getCurrentLanguageConfig();
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Use Intl.DateTimeFormat for proper localization
    return new Intl.DateTimeFormat(config.code, {
      dateStyle: 'medium',
    }).format(dateObj);
  }

  /**
   * Performs the format time operation.
   * @param date - The date.
   * @returns The string value.
   */
  formatTime(date: Date | string): string {
    const config = this.getCurrentLanguageConfig();
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat(config.code, {
      timeStyle: 'medium',
    }).format(dateObj);
  }

  /**
   * Performs the format date time operation.
   * @param date - The date.
   * @returns The string value.
   */
  formatDateTime(date: Date | string): string {
    const config = this.getCurrentLanguageConfig();
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    return new Intl.DateTimeFormat(config.code, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(dateObj);
  }

  /**
   * Performs the format number operation.
   * @param value - The value.
   * @param decimals - The decimals.
   * @returns The string value.
   */
  formatNumber(value: number, decimals?: number): string {
    const config = this.getCurrentLanguageConfig();

    return new Intl.NumberFormat(config.code, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  /**
   * Performs the format currency operation.
   * @param value - The value.
   * @returns The string value.
   */
  formatCurrency(value: number): string {
    const config = this.getCurrentLanguageConfig();

    return new Intl.NumberFormat(config.code, {
      style: 'currency',
      currency:
        config.code === 'zh-CN'
          ? 'CNY'
          : config.code === 'en-US'
            ? 'USD'
            : config.code === 'zh-TW'
              ? 'TWD'
              : config.code === 'ja-JP'
                ? 'JPY'
                : config.code === 'ko-KR'
                  ? 'KRW'
                  : 'USD',
    }).format(value);
  }

  /**
   * Performs the format percent operation.
   * @param value - The value.
   * @param decimals - The decimals.
   * @returns The string value.
   */
  formatPercent(value: number, decimals = 0): string {
    const config = this.getCurrentLanguageConfig();

    return new Intl.NumberFormat(config.code, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  }

  // Fallback translations (embedded for offline support)
  private getFallbackTranslations(language: Language): TranslationStrings {
    const fallbacks: Record<Language, TranslationStrings> = {
      'zh-CN': {
        common: {
          loading: '加载中...',
          save: '保存',
          cancel: '取消',
          delete: '删除',
          edit: '编辑',
          confirm: '确认',
          search: '搜索',
          filter: '筛选',
          export: '导出',
          import: '导入',
          refresh: '刷新',
          close: '关闭',
          back: '返回',
          next: '下一步',
          previous: '上一步',
          submit: '提交',
          reset: '重置',
          yes: '是',
          no: '否',
        },
        app: {
          title: 'AI智能招聘助手',
          description: '智能简历筛选和分析系统',
          welcome: '欢迎使用AI智能招聘助手',
        },
        navigation: {
          dashboard: '控制台',
          analysis: '分析',
          jobs: '岗位管理',
          results: '结果',
          settings: '设置',
          help: '帮助',
          profile: '个人资料',
          logout: '退出',
        },
        messages: {
          success: '操作成功',
          error: '操作失败',
          warning: '警告',
          info: '提示',
          confirmDelete: '确定要删除吗？',
          noData: '暂无数据',
          networkError: '网络错误，请稍后重试',
        },
        validation: {
          required: '该字段不能为空',
          minLength: '最少输入{{length}}个字符',
          maxLength: '最多输入{{length}}个字符',
          email: '请输入有效的邮箱地址',
          pattern: '格式不正确',
        },
      },
      'en-US': {
        common: {
          loading: 'Loading...',
          save: 'Save',
          cancel: 'Cancel',
          delete: 'Delete',
          edit: 'Edit',
          confirm: 'Confirm',
          search: 'Search',
          filter: 'Filter',
          export: 'Export',
          import: 'Import',
          refresh: 'Refresh',
          close: 'Close',
          back: 'Back',
          next: 'Next',
          previous: 'Previous',
          submit: 'Submit',
          reset: 'Reset',
          yes: 'Yes',
          no: 'No',
        },
        app: {
          title: 'AI Recruitment Assistant',
          description: 'Intelligent Resume Screening and Analysis System',
          welcome: 'Welcome to AI Recruitment Assistant',
        },
        navigation: {
          dashboard: 'Dashboard',
          analysis: 'Analysis',
          jobs: 'Job Management',
          results: 'Results',
          settings: 'Settings',
          help: 'Help',
          profile: 'Profile',
          logout: 'Logout',
        },
        messages: {
          success: 'Operation successful',
          error: 'Operation failed',
          warning: 'Warning',
          info: 'Info',
          confirmDelete: 'Are you sure you want to delete?',
          noData: 'No data available',
          networkError: 'Network error, please try again later',
        },
        validation: {
          required: 'This field is required',
          minLength: 'Minimum {{length}} characters required',
          maxLength: 'Maximum {{length}} characters allowed',
          email: 'Please enter a valid email address',
          pattern: 'Invalid format',
        },
      },
      'zh-TW': {
        common: {
          loading: '載入中...',
          save: '儲存',
          cancel: '取消',
          delete: '刪除',
          edit: '編輯',
          confirm: '確認',
          search: '搜尋',
          filter: '篩選',
          export: '匯出',
          import: '匯入',
          refresh: '重新整理',
          close: '關閉',
          back: '返回',
          next: '下一步',
          previous: '上一步',
          submit: '提交',
          reset: '重設',
          yes: '是',
          no: '否',
        },
        app: {
          title: 'AI智慧招募助手',
          description: '智慧履歷篩選和分析系統',
          welcome: '歡迎使用AI智慧招募助手',
        },
        navigation: {
          dashboard: '控制台',
          analysis: '分析',
          jobs: '崗位管理',
          results: '結果',
          settings: '設定',
          help: '說明',
          profile: '個人資料',
          logout: '登出',
        },
        messages: {
          success: '操作成功',
          error: '操作失敗',
          warning: '警告',
          info: '提示',
          confirmDelete: '確定要刪除嗎？',
          noData: '暫無資料',
          networkError: '網路錯誤，請稍後重試',
        },
        validation: {
          required: '此欄位為必填',
          minLength: '至少輸入{{length}}個字元',
          maxLength: '最多輸入{{length}}個字元',
          email: '請輸入有效的電子郵件地址',
          pattern: '格式不正確',
        },
      },
      'ja-JP': {
        common: {
          loading: '読み込み中...',
          save: '保存',
          cancel: 'キャンセル',
          delete: '削除',
          edit: '編集',
          confirm: '確認',
          search: '検索',
          filter: 'フィルター',
          export: 'エクスポート',
          import: 'インポート',
          refresh: '更新',
          close: '閉じる',
          back: '戻る',
          next: '次へ',
          previous: '前へ',
          submit: '送信',
          reset: 'リセット',
          yes: 'はい',
          no: 'いいえ',
        },
        app: {
          title: 'AI採用アシスタント',
          description: 'インテリジェント履歴書スクリーニングおよび分析システム',
          welcome: 'AI採用アシスタントへようこそ',
        },
        navigation: {
          dashboard: 'ダッシュボード',
          analysis: '分析',
          jobs: '職務管理',
          results: '結果',
          settings: '設定',
          help: 'ヘルプ',
          profile: 'プロフィール',
          logout: 'ログアウト',
        },
        messages: {
          success: '操作成功',
          error: '操作失敗',
          warning: '警告',
          info: '情報',
          confirmDelete: '削除してもよろしいですか？',
          noData: 'データがありません',
          networkError: 'ネットワークエラー、後でもう一度お試しください',
        },
        validation: {
          required: 'この項目は必須です',
          minLength: '{{length}}文字以上入力してください',
          maxLength: '{{length}}文字以内で入力してください',
          email: '有効なメールアドレスを入力してください',
          pattern: '形式が正しくありません',
        },
      },
      'ko-KR': {
        common: {
          loading: '로딩 중...',
          save: '저장',
          cancel: '취소',
          delete: '삭제',
          edit: '편집',
          confirm: '확인',
          search: '검색',
          filter: '필터',
          export: '내보내기',
          import: '가져오기',
          refresh: '새로고침',
          close: '닫기',
          back: '뒤로',
          next: '다음',
          previous: '이전',
          submit: '제출',
          reset: '재설정',
          yes: '예',
          no: '아니오',
        },
        app: {
          title: 'AI 채용 도우미',
          description: '지능형 이력서 심사 및 분석 시스템',
          welcome: 'AI 채용 도우미에 오신 것을 환영합니다',
        },
        navigation: {
          dashboard: '대시보드',
          analysis: '분석',
          jobs: '채용 관리',
          results: '결과',
          settings: '설정',
          help: '도움말',
          profile: '프로필',
          logout: '로그아웃',
        },
        messages: {
          success: '작업 성공',
          error: '작업 실패',
          warning: '경고',
          info: '정보',
          confirmDelete: '삭제하시겠습니까?',
          noData: '데이터 없음',
          networkError: '네트워크 오류, 나중에 다시 시도하세요',
        },
        validation: {
          required: '이 필드는 필수입니다',
          minLength: '{{length}}자 이상 입력하세요',
          maxLength: '{{length}}자 이하로 입력하세요',
          email: '유효한 이메일 주소를 입력하세요',
          pattern: '형식이 올바르지 않습니다',
        },
      },
    };

    return fallbacks[language] || fallbacks[this.DEFAULT_LANGUAGE];
  }
}
