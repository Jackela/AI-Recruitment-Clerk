import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GuideOverlayComponent } from './components/shared/guide-overlay/guide-overlay.component';
import { StatusNotificationsComponent } from './components/shared/status-notifications/status-notifications.component';
import { AriaLiveComponent } from './components/shared/aria-live/aria-live.component';
import { NavigationGuideService } from './services/navigation/navigation-guide.service';
import { ProgressFeedbackService } from './services/feedback/progress-feedback.service';
import { KeyboardNavigationService } from './services/keyboard/keyboard-navigation.service';
import { WebSocketStatsService } from './services/realtime/websocket-stats.service';
import { AccessibilityService } from './services/accessibility/accessibility.service';
import { SkipNavigationDirective } from './directives/accessibility/skip-navigation.directive';

@Component({
  selector: 'arc-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet, 
    RouterLink, 
    GuideOverlayComponent, 
    StatusNotificationsComponent,
    AriaLiveComponent,
    SkipNavigationDirective
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  protected title = 'ai-recruitment-frontend';
  protected settingsMenuOpen = signal(false);

  private navigationGuide = inject(NavigationGuideService);
  private progressFeedback = inject(ProgressFeedbackService);
  private keyboardNav = inject(KeyboardNavigationService);
  private websocketStats = inject(WebSocketStatsService);
  private accessibilityService = inject(AccessibilityService);
  
  keyboardHelpVisible = signal(false);
  isLoading = signal(false);
  guideOverlayVisible = signal(false);
  
  // Accessibility preferences
  highContrastEnabled = signal(false);
  reducedMotionEnabled = signal(false);
  currentFontSize = signal<'normal' | 'large' | 'larger'>('normal');

  ngOnInit(): void {
    // Initialize UX services
    this.initializeUXServices();
    
    // Setup global keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Initialize accessibility features
    this.initializeAccessibility();
    
    // Show welcome notification for first-time users
    this.showWelcomeMessage();
  }

  ngOnDestroy(): void {
    // Cleanup services
    this.websocketStats.destroy();
    this.keyboardNav.destroy();
  }

  private initializeUXServices(): void {
    // Start real-time statistics
    this.websocketStats.subscribeToStats().subscribe(stats => {
      // Update global stats
      if (stats.errorRate > 10) {
        this.progressFeedback.showWarning(
          '系统警告',
          '当前系统错误率较高，可能影响分析速度'
        );
      }
    });

    // Monitor connection status
    // Note: isConnected is a signal, we'll use effect for watching changes
    // For now, just check initial state
    if (!this.websocketStats.isConnected()) {
      this.progressFeedback.showInfo(
        '连接状态',
        '正在使用离线模式，统计数据可能不是最新的'
      );
    }
  }

  private setupKeyboardShortcuts(): void {
    // Navigation shortcuts
    this.accessibilityService.registerShortcut({
      key: '1',
      altKey: true,
      description: 'Go to Dashboard',
      action: () => this.navigateTo('/dashboard')
    });

    this.accessibilityService.registerShortcut({
      key: '2',
      altKey: true,
      description: 'Go to Analysis',
      action: () => this.navigateTo('/analysis')
    });

    this.accessibilityService.registerShortcut({
      key: '3',
      altKey: true,
      description: 'Go to Results',
      action: () => this.navigateTo('/results')
    });

    // Help shortcut
    this.accessibilityService.registerShortcut({
      key: 'h',
      altKey: true,
      description: 'Show keyboard help',
      action: () => this.showKeyboardHelp()
    });

    // App-specific shortcuts
    this.accessibilityService.registerShortcut({
      key: 'r',
      ctrlKey: true,
      shiftKey: true,
      description: 'Refresh data',
      action: () => this.refreshData()
    });

    this.accessibilityService.registerShortcut({
      key: 'n',
      ctrlKey: true,
      description: 'New analysis',
      action: () => this.navigateToAnalysis()
    });

    // Modal shortcuts
    this.accessibilityService.registerShortcut({
      key: 'Escape',
      description: 'Close modals and menus',
      action: () => this.closeModalsAndMenus()
    });
  }

  private showWelcomeMessage(): void {
    // Check if first visit
    const isFirstVisit = !localStorage.getItem('app_visited');
    
    if (isFirstVisit) {
      localStorage.setItem('app_visited', 'true');
      
      setTimeout(() => {
        this.progressFeedback.showSuccess(
          '欢迎使用AI招聘助手！',
          '点击右上角的帮助按钮查看使用指南，或按 Alt+H 显示快捷键帮助',
          8000
        );
      }, 2000);
    }
  }

  private refreshData(): void {
    this.progressFeedback.startLoading('refresh', '正在刷新数据...');
    this.websocketStats.refreshStats();
    
    setTimeout(() => {
      this.progressFeedback.stopLoading('refresh');
      this.progressFeedback.showSuccess('刷新完成', '数据已更新');
    }, 1500);
  }

  private navigateToAnalysis(): void {
    // Navigate to analysis page
    window.location.href = '/analysis';
  }

  // Accessibility Methods
  private initializeAccessibility(): void {
    // Subscribe to accessibility state changes using effect
    effect(() => {
      const state = this.accessibilityService.accessibilityState();
      this.highContrastEnabled.set(state.highContrast);
      this.reducedMotionEnabled.set(state.reducedMotion);
      this.currentFontSize.set(state.fontSize);
    });

    // Announce application ready
    setTimeout(() => {
      this.accessibilityService.announce(
        'AI Recruitment Assistant application loaded and ready for use',
        'polite'
      );
    }, 1000);
  }

  showKeyboardHelp(): void {
    this.keyboardHelpVisible.set(true);
    this.accessibilityService.announce('Keyboard shortcuts help opened', 'polite');
    
    // Set focus trap on modal
    setTimeout(() => {
      const modal = document.querySelector('.keyboard-help-modal');
      if (modal) {
        this.accessibilityService.setFocusTrap(modal as HTMLElement);
      }
    }, 100);
  }

  hideKeyboardHelp(): void {
    this.keyboardHelpVisible.set(false);
    this.accessibilityService.releaseFocusTrap();
    this.accessibilityService.announce('Keyboard shortcuts help closed', 'polite');
  }

  toggleSettingsMenu(): void {
    const isOpen = !this.settingsMenuOpen();
    this.settingsMenuOpen.set(isOpen);
    
    if (isOpen) {
      this.accessibilityService.announce('Accessibility settings menu opened', 'polite');
      
      // Focus first menu item
      setTimeout(() => {
        const firstMenuItem = document.querySelector('.settings-menu [role="menuitem"]') as HTMLElement;
        if (firstMenuItem) {
          this.accessibilityService.setFocus(firstMenuItem);
        }
      }, 100);
    } else {
      this.accessibilityService.announce('Accessibility settings menu closed', 'polite');
    }
  }

  toggleHighContrast(): void {
    const enabled = !this.highContrastEnabled();
    this.accessibilityService.setHighContrast(enabled);
    this.settingsMenuOpen.set(false);
  }

  toggleReducedMotion(): void {
    const enabled = !this.reducedMotionEnabled();
    this.accessibilityService.setReducedMotion(enabled);
    this.settingsMenuOpen.set(false);
  }

  increaseFontSize(): void {
    const currentSize = this.currentFontSize();
    const nextSize = currentSize === 'normal' ? 'large' : 
                    currentSize === 'large' ? 'larger' : 'normal';
    
    this.accessibilityService.setFontSize(nextSize);
    this.settingsMenuOpen.set(false);
  }

  private navigateTo(route: string): void {
    // Close any open modals first
    this.closeModalsAndMenus();
    
    // Navigate to route
    window.location.href = route;
    
    // Announce navigation
    this.accessibilityService.announce(
      `Navigating to ${route.replace('/', '')} page`,
      'assertive'
    );
  }

  private closeModalsAndMenus(): void {
    this.keyboardHelpVisible.set(false);
    this.settingsMenuOpen.set(false);
    this.guideOverlayVisible.set(false);
    
    // Release any focus traps
    this.accessibilityService.releaseFocusTrap();
  }
}
