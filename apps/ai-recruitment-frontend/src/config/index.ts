/**
 * 配置模块统一导出
 * 便于其他模块引用配置
 */

export { APP_CONFIG, type AppConfig } from './app.config';
export { I18N_TEXTS, type I18nTexts, getText, getTextWithParams } from './i18n.config';