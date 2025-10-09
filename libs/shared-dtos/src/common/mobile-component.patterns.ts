/**
 * 移动端组件通用模式 - 减少重复代码
 * Mobile Component Common Patterns - Reduce Code Duplication
 */

import { Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * 通用移动端组件接口
 */
export interface MobileComponentConfig {
  enableSwipe?: boolean;
  enablePullToRefresh?: boolean;
  showLoadingSpinner?: boolean;
  animationDuration?: number;
}

/**
 * Defines the shape of the swipe config.
 */
export interface SwipeConfig {
  threshold: number;
  velocity: number;
  direction: 'horizontal' | 'vertical' | 'both';
}

/**
 * Defines the shape of the loading state.
 */
export interface LoadingState {
  isLoading: boolean;
  loadingText?: string;
  progress?: number;
}

/**
 * 移动端基础组件抽象类
 */
export abstract class BaseMobileComponent implements OnInit, OnDestroy {
  @Input() config: MobileComponentConfig = {};
  @Input() loadingState: LoadingState = { isLoading: false };
  
  @Output() swipeLeft = new EventEmitter<any>();
  @Output() swipeRight = new EventEmitter<any>();
  @Output() swipeUp = new EventEmitter<any>();
  @Output() swipeDown = new EventEmitter<any>();
  @Output() pullToRefresh = new EventEmitter<void>();
  @Output() loadMore = new EventEmitter<void>();

  protected destroy$ = new Subject<void>();
  protected isDestroyed = false;

  // 默认配置
  protected defaultConfig: MobileComponentConfig = {
    enableSwipe: true,
    enablePullToRefresh: false,
    showLoadingSpinner: true,
    animationDuration: 300
  };

  /**
   * Performs the ng on init operation.
   */
  ngOnInit(): void {
    this.config = { ...this.defaultConfig, ...this.config };
    this.setupComponent();
    this.onMobileInit();
  }

  /**
   * Performs the ng on destroy operation.
   */
  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
    this.onMobileDestroy();
  }

  /**
   * 组件初始化设置
   */
  protected setupComponent(): void {
    if (this.config.enableSwipe) {
      this.setupSwipeHandlers();
    }
    
    if (this.config.enablePullToRefresh) {
      this.setupPullToRefresh();
    }
  }

  /**
   * 设置滑动事件处理
   */
  protected setupSwipeHandlers(): void {
    // 子类可以重写此方法来实现具体的滑动逻辑
  }

  /**
   * 设置下拉刷新
   */
  protected setupPullToRefresh(): void {
    // 子类可以重写此方法来实现下拉刷新逻辑
  }

  /**
   * 处理滑动事件
   */
  protected handleSwipe(direction: 'left' | 'right' | 'up' | 'down', data?: any): void {
    switch (direction) {
      case 'left':
        this.swipeLeft.emit(data);
        break;
      case 'right':
        this.swipeRight.emit(data);
        break;
      case 'up':
        this.swipeUp.emit(data);
        break;
      case 'down':
        this.swipeDown.emit(data);
        break;
    }
  }

  /**
   * 显示加载状态
   */
  protected setLoading(isLoading: boolean, text?: string, progress?: number): void {
    this.loadingState = {
      isLoading,
      loadingText: text,
      progress
    };
  }

  /**
   * 安全的setTimeout，在组件销毁时自动清理
   */
  protected safeSetTimeout(callback: () => void, delay: number): void {
    setTimeout(() => {
      if (!this.isDestroyed) {
        callback();
      }
    }, delay);
  }

  /**
   * 子类需要实现的方法
   */
  protected abstract onMobileInit(): void;
  protected abstract onMobileDestroy(): void;
}

/**
 * 移动端列表组件基类
 */
export abstract class BaseMobileListComponent<T> extends BaseMobileComponent {
  @Input() items: T[] = [];
  @Input() enableVirtualScroll = false;
  @Input() itemHeight = 80;
  @Input() loadMoreThreshold = 200;

  @Output() itemClick = new EventEmitter<T>();
  @Output() itemLongPress = new EventEmitter<T>();

  protected currentPage = 1;
  protected pageSize = 20;
  protected hasMoreData = true;

  protected onMobileInit(): void {
    this.setupInfiniteScroll();
    this.onListInit();
  }

  protected onMobileDestroy(): void {
    this.onListDestroy();
  }

  /**
   * 设置无限滚动
   */
  protected setupInfiniteScroll(): void {
    // 实现无限滚动逻辑
  }

  /**
   * 加载更多数据
   */
  protected loadMoreData(): void {
    if (!this.hasMoreData || this.loadingState.isLoading) {
      return;
    }

    this.setLoading(true, '加载更多...');
    this.loadMore.emit();
  }

  /**
   * 刷新数据
   */
  protected refreshData(): void {
    this.currentPage = 1;
    this.hasMoreData = true;
    this.setLoading(true, '刷新中...');
    this.pullToRefresh.emit();
  }

  /**
   * 处理项目点击
   */
  protected onItemClick(item: T): void {
    this.itemClick.emit(item);
  }

  /**
   * 处理项目长按
   */
  protected onItemLongPress(item: T): void {
    this.itemLongPress.emit(item);
  }

  /**
   * 子类需要实现的方法
   */
  protected abstract onListInit(): void;
  protected abstract onListDestroy(): void;
}

/**
 * 移动端表单组件基类
 */
export abstract class BaseMobileFormComponent extends BaseMobileComponent {
  @Input() formData: any = {};
  @Input() validationRules: any = {};
  @Input() showValidationErrors = true;

  @Output() formSubmit = new EventEmitter<any>();
  @Output() formReset = new EventEmitter<void>();
  @Output() fieldChange = new EventEmitter<{ field: string; value: any }>();

  protected formErrors: Record<string, string[]> = {};
  protected isFormValid = false;

  protected onMobileInit(): void {
    this.validateForm();
    this.onFormInit();
  }

  protected onMobileDestroy(): void {
    this.onFormDestroy();
  }

  /**
   * 验证表单
   */
  protected validateForm(): boolean {
    this.formErrors = {};
    this.isFormValid = true;

    // 实现表单验证逻辑
    for (const [field, rules] of Object.entries(this.validationRules)) {
      const value = this.formData[field];
      const errors = this.validateField(field, value, rules as any);
      
      if (errors.length > 0) {
        this.formErrors[field] = errors;
        this.isFormValid = false;
      }
    }

    return this.isFormValid;
  }

  /**
   * 验证单个字段
   */
  protected validateField(field: string, value: any, rules: any): string[] {
    const errors: string[] = [];

    if (rules.required && (!value || value.trim() === '')) {
      errors.push(`${field} 是必填项`);
    }

    if (rules.minLength && value && value.length < rules.minLength) {
      errors.push(`${field} 最少需要 ${rules.minLength} 个字符`);
    }

    if (rules.maxLength && value && value.length > rules.maxLength) {
      errors.push(`${field} 最多允许 ${rules.maxLength} 个字符`);
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
      errors.push(`${field} 格式不正确`);
    }

    return errors;
  }

  /**
   * 处理字段变化
   */
  protected onFieldChange(field: string, value: any): void {
    this.formData[field] = value;
    this.fieldChange.emit({ field, value });
    
    // 实时验证
    if (this.showValidationErrors) {
      this.validateForm();
    }
  }

  /**
   * 提交表单
   */
  protected onSubmit(): void {
    if (this.validateForm()) {
      this.formSubmit.emit(this.formData);
    }
  }

  /**
   * 重置表单
   */
  protected onReset(): void {
    this.formData = {};
    this.formErrors = {};
    this.isFormValid = false;
    this.formReset.emit();
  }

  /**
   * 获取字段错误信息
   */
  protected getFieldErrors(field: string): string[] {
    return this.formErrors[field] || [];
  }

  /**
   * 检查字段是否有错误
   */
  protected hasFieldError(field: string): boolean {
    return this.getFieldErrors(field).length > 0;
  }

  /**
   * 子类需要实现的方法
   */
  protected abstract onFormInit(): void;
  protected abstract onFormDestroy(): void;
}

/**
 * 移动端卡片组件接口
 */
export interface CardData {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  actions?: CardAction[];
  metadata?: Record<string, any>;
}

/**
 * Defines the shape of the card action.
 */
export interface CardAction {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  handler: () => void;
}

/**
 * 移动端卡片组件基类
 */
export abstract class BaseMobileCardComponent extends BaseMobileComponent {
  @Input() cardData: CardData = { id: '', title: '' };
  @Input() showActions = true;
  @Input() showImage = true;
  @Input() cardStyle: 'flat' | 'elevated' | 'outlined' = 'elevated';

  @Output() cardClick = new EventEmitter<CardData>();
  @Output() actionClick = new EventEmitter<{ action: CardAction; card: CardData }>();

  protected onMobileInit(): void {
    this.onCardInit();
  }

  protected onMobileDestroy(): void {
    this.onCardDestroy();
  }

  /**
   * 处理卡片点击
   */
  protected onCardClick(): void {
    this.cardClick.emit(this.cardData);
  }

  /**
   * 处理动作点击
   */
  protected onActionClick(action: CardAction, event: Event): void {
    event.stopPropagation();
    this.actionClick.emit({ action, card: this.cardData });
    action.handler();
  }

  /**
   * 子类需要实现的方法
   */
  protected abstract onCardInit(): void;
  protected abstract onCardDestroy(): void;
}

/**
 * 触摸手势工具类
 */
export class TouchGestureUtil {
  static readonly SWIPE_THRESHOLD = 50;
  static readonly SWIPE_VELOCITY = 0.3;

  /**
   * Performs the detect swipe operation.
   * @param startX - The start x.
   * @param startY - The start y.
   * @param endX - The end x.
   * @param endY - The end y.
   * @param timeElapsed - The time elapsed.
   * @returns The 'left' | 'right' | 'up' | 'down' | null.
   */
  static detectSwipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    timeElapsed: number
  ): 'left' | 'right' | 'up' | 'down' | null {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / timeElapsed;

    if (distance < this.SWIPE_THRESHOLD || velocity < this.SWIPE_VELOCITY) {
      return null;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  /**
   * Performs the add touch listeners operation.
   * @param element - The element.
   * @param callbacks - The callbacks.
   * @returns The () => void.
   */
  static addTouchListeners(
    element: HTMLElement,
    callbacks: {
      onSwipe?: (direction: string, data?: any) => void;
      onTap?: (event: TouchEvent) => void;
      onLongPress?: (event: TouchEvent) => void;
    }
  ): () => void {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let longPressTimer: number | null = null;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();

      if (callbacks.onLongPress) {
        longPressTimer = window.setTimeout(() => {
          callbacks.onLongPress!(event);
        }, 500);
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }

      const touch = event.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();
      const timeElapsed = endTime - startTime;

      // 检测轻击
      if (timeElapsed < 200 && callbacks.onTap) {
        const distance = Math.sqrt(
          Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
        );
        if (distance < 10) {
          callbacks.onTap(event);
          return;
        }
      }

      // 检测滑动
      if (callbacks.onSwipe) {
        const direction = this.detectSwipe(startX, startY, endX, endY, timeElapsed);
        if (direction) {
          callbacks.onSwipe(direction);
        }
      }
    };

    element.addEventListener('touchstart', onTouchStart);
    element.addEventListener('touchend', onTouchEnd);

    // 返回清理函数
    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchend', onTouchEnd);
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }
}