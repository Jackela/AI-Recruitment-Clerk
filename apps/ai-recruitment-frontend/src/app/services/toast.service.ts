import { Injectable } from '@angular/core';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts: ToastMessage[] = [];

  constructor() {}

  success(message: string, duration: number = 3000): void {
    this.show({ message, type: 'success', duration });
  }

  error(message: string, duration: number = 5000): void {
    this.show({ message, type: 'error', duration });
  }

  warning(message: string, duration: number = 4000): void {
    this.show({ message, type: 'warning', duration });
  }

  info(message: string, duration: number = 3000): void {
    this.show({ message, type: 'info', duration });
  }

  private show(toast: ToastMessage): void {
    this.toasts.push(toast);
    
    // 简单的控制台输出实现，实际项目中会有UI组件
    const prefix = toast.type.toUpperCase();
    console.log(`[${prefix}] ${toast.message}`);
    
    // 自动移除toast
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.remove(toast);
      }, toast.duration);
    }
  }

  private remove(toast: ToastMessage): void {
    const index = this.toasts.indexOf(toast);
    if (index > -1) {
      this.toasts.splice(index, 1);
    }
  }

  getToasts(): ToastMessage[] {
    return this.toasts;
  }

  clear(): void {
    this.toasts = [];
  }
}