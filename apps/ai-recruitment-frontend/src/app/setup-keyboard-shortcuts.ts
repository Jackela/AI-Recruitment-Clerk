import type { AccessibilityService } from './services/accessibility/accessibility.service';
import type { ThemeService } from './services/theme/theme.service';

interface ShortcutOptions {
  accessibilityService: AccessibilityService;
  themeService: ThemeService;
  navigateTo: (route: string) => void;
  showKeyboardHelp: () => void;
  refreshData: () => void;
  navigateToAnalysis: () => void;
  closeModals: () => void;
  getText: (key: string) => string;
}

export function registerKeyboardShortcuts({
  accessibilityService,
  themeService,
  navigateTo,
  showKeyboardHelp,
  refreshData,
  navigateToAnalysis,
  closeModals,
  getText,
}: ShortcutOptions): void {
  accessibilityService.registerShortcut({
    key: '1',
    altKey: true,
    description: getText('ACCESSIBILITY.shortcuts.dashboard'),
    action: () => navigateTo('/dashboard'),
  });

  accessibilityService.registerShortcut({
    key: '2',
    altKey: true,
    description: getText('ACCESSIBILITY.shortcuts.analysis'),
    action: () => navigateTo('/analysis'),
  });

  accessibilityService.registerShortcut({
    key: '3',
    altKey: true,
    description: getText('ACCESSIBILITY.shortcuts.results'),
    action: () => navigateTo('/results'),
  });

  accessibilityService.registerShortcut({
    key: 'h',
    altKey: true,
    description: 'Show keyboard help',
    action: () => showKeyboardHelp(),
  });

  accessibilityService.registerShortcut({
    key: 'r',
    ctrlKey: true,
    shiftKey: true,
    description: 'Refresh data',
    action: () => refreshData(),
  });

  accessibilityService.registerShortcut({
    key: 'n',
    ctrlKey: true,
    description: 'New analysis',
    action: () => navigateToAnalysis(),
  });

  accessibilityService.registerShortcut({
    key: 'Escape',
    description: 'Close modals and menus',
    action: () => closeModals(),
  });

  accessibilityService.registerShortcut({
    key: 't',
    altKey: true,
    description: 'Toggle theme',
    action: () => themeService.toggleTheme(),
  });
}

