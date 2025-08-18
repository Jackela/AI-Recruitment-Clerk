import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable, fromEvent } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';
import { InteractionService } from '../core/interaction.service';

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  keys: string[];
  context?: string;
  action: () => void;
  category: 'navigation' | 'editing' | 'selection' | 'workflow' | 'global';
  enabled: boolean;
  preventDefault?: boolean;
  allowInInputs?: boolean;
}

export interface ShortcutCategory {
  name: string;
  label: string;
  icon: string;
  shortcuts: KeyboardShortcut[];
}

export interface ShortcutPalette {
  isOpen: boolean;
  query: string;
  filteredShortcuts: KeyboardShortcut[];
  selectedIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutService {
  private shortcuts = new BehaviorSubject<KeyboardShortcut[]>([]);
  private paletteState = new BehaviorSubject<ShortcutPalette>({
    isOpen: false,
    query: '',
    filteredShortcuts: [],
    selectedIndex: 0
  });

  private destroy$ = new Subject<void>();
  private keySequence: string[] = [];
  private sequenceTimeout: any;
  private currentContext = 'global';

  // Power user features
  private customShortcuts = new Map<string, KeyboardShortcut>();
  private shortcutUsage = new Map<string, number>();
  private recentShortcuts: string[] = [];

  constructor(private interactionService: InteractionService) {
    this.initializeShortcuts();
    this.setupKeyboardListeners();
    this.loadCustomShortcuts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeShortcuts(): void {
    const shortcuts: KeyboardShortcut[] = [
      // Global Navigation
      {
        id: 'global_dashboard',
        name: 'Go to Dashboard',
        description: 'Navigate to the main dashboard',
        keys: ['g', 'd'],
        category: 'navigation',
        enabled: true,
        action: () => this.navigateTo('/dashboard')
      },
      {
        id: 'global_candidates',
        name: 'Go to Candidates',
        description: 'Navigate to candidates page',
        keys: ['g', 'c'],
        category: 'navigation',
        enabled: true,
        action: () => this.navigateTo('/candidates')
      },
      {
        id: 'global_search',
        name: 'Global Search',
        description: 'Open global search',
        keys: ['ctrl+k'],
        category: 'navigation',
        enabled: true,
        preventDefault: true,
        allowInInputs: true,
        action: () => this.openGlobalSearch()
      },
      {
        id: 'global_help',
        name: 'Show Help',
        description: 'Open help documentation',
        keys: ['?'],
        category: 'global',
        enabled: true,
        action: () => this.showHelp()
      },
      {
        id: 'command_palette',
        name: 'Command Palette',
        description: 'Open command palette',
        keys: ['ctrl+shift+p'],
        category: 'global',
        enabled: true,
        preventDefault: true,
        allowInInputs: true,
        action: () => this.toggleCommandPalette()
      },

      // File Upload & Processing
      {
        id: 'upload_files',
        name: 'Upload Files',
        description: 'Open file upload dialog',
        keys: ['u'],
        context: 'file_upload',
        category: 'workflow',
        enabled: true,
        action: () => this.triggerFileUpload()
      },
      {
        id: 'process_batch',
        name: 'Process Batch',
        description: 'Start batch processing',
        keys: ['ctrl+enter'],
        context: 'file_upload',
        category: 'workflow',
        enabled: true,
        preventDefault: true,
        action: () => this.startBatchProcessing()
      },

      // Resume Review
      {
        id: 'quick_score',
        name: 'Quick Score',
        description: 'Generate quick score for current resume',
        keys: ['ctrl+q'],
        context: 'resume_review',
        category: 'workflow',
        enabled: true,
        preventDefault: true,
        action: () => this.quickScore()
      },
      {
        id: 'tag_resume',
        name: 'Tag Resume',
        description: 'Add tags to current resume',
        keys: ['ctrl+t'],
        context: 'resume_review',
        category: 'editing',
        enabled: true,
        preventDefault: true,
        action: () => this.openTagDialog()
      },
      {
        id: 'next_resume',
        name: 'Next Resume',
        description: 'Move to next resume',
        keys: ['j', 'ArrowDown'],
        context: 'resume_review',
        category: 'navigation',
        enabled: true,
        action: () => this.nextResume()
      },
      {
        id: 'previous_resume',
        name: 'Previous Resume',
        description: 'Move to previous resume',
        keys: ['k', 'ArrowUp'],
        context: 'resume_review',
        category: 'navigation',
        enabled: true,
        action: () => this.previousResume()
      },
      {
        id: 'approve_candidate',
        name: 'Approve Candidate',
        description: 'Mark candidate as approved',
        keys: ['a'],
        context: 'resume_review',
        category: 'workflow',
        enabled: true,
        action: () => this.approveCandidate()
      },
      {
        id: 'reject_candidate',
        name: 'Reject Candidate',
        description: 'Mark candidate as rejected',
        keys: ['r'],
        context: 'resume_review',
        category: 'workflow',
        enabled: true,
        action: () => this.rejectCandidate()
      },

      // Search & Filtering
      {
        id: 'focus_search',
        name: 'Focus Search',
        description: 'Focus on search input',
        keys: ['/'],
        context: 'candidate_search',
        category: 'navigation',
        enabled: true,
        action: () => this.focusSearch()
      },
      {
        id: 'clear_filters',
        name: 'Clear Filters',
        description: 'Clear all applied filters',
        keys: ['ctrl+shift+c'],
        context: 'candidate_search',
        category: 'editing',
        enabled: true,
        preventDefault: true,
        action: () => this.clearFilters()
      },
      {
        id: 'save_search',
        name: 'Save Search',
        description: 'Save current search parameters',
        keys: ['ctrl+s'],
        context: 'candidate_search',
        category: 'workflow',
        enabled: true,
        preventDefault: true,
        action: () => this.saveSearch()
      },

      // Selection & Bulk Operations
      {
        id: 'select_all',
        name: 'Select All',
        description: 'Select all items in current view',
        keys: ['ctrl+a'],
        category: 'selection',
        enabled: true,
        preventDefault: true,
        action: () => this.selectAll()
      },
      {
        id: 'bulk_action',
        name: 'Bulk Actions',
        description: 'Open bulk actions menu',
        keys: ['ctrl+b'],
        category: 'workflow',
        enabled: true,
        preventDefault: true,
        action: () => this.openBulkActions()
      },

      // Dashboard Navigation
      {
        id: 'refresh_dashboard',
        name: 'Refresh Dashboard',
        description: 'Refresh dashboard data',
        keys: ['r'],
        context: 'dashboard',
        category: 'navigation',
        enabled: true,
        action: () => this.refreshDashboard()
      },
      {
        id: 'toggle_sidebar',
        name: 'Toggle Sidebar',
        description: 'Show/hide sidebar',
        keys: ['ctrl+\\'],
        category: 'navigation',
        enabled: true,
        preventDefault: true,
        action: () => this.toggleSidebar()
      },

      // Accessibility
      {
        id: 'skip_to_content',
        name: 'Skip to Content',
        description: 'Skip navigation and go to main content',
        keys: ['alt+s'],
        category: 'navigation',
        enabled: true,
        preventDefault: true,
        allowInInputs: true,
        action: () => this.skipToContent()
      },
      {
        id: 'toggle_high_contrast',
        name: 'Toggle High Contrast',
        description: 'Toggle high contrast mode',
        keys: ['ctrl+alt+h'],
        category: 'global',
        enabled: true,
        preventDefault: true,
        allowInInputs: true,
        action: () => this.toggleHighContrast()
      }
    ];

    this.shortcuts.next(shortcuts);
  }

  private setupKeyboardListeners(): void {
    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe(
        takeUntil(this.destroy$),
        filter(event => this.shouldProcessEvent(event))
      )
      .subscribe(event => {
        this.handleKeyEvent(event);
      });

    // Setup sequence timeout
    fromEvent<KeyboardEvent>(document, 'keyup')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.resetSequenceTimeout();
      });
  }

  private shouldProcessEvent(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true';

    // Skip if in input and shortcut doesn't allow inputs
    if (isInputElement) {
      const potentialShortcuts = this.getMatchingShortcuts(event);
      return potentialShortcuts.some(shortcut => shortcut.allowInInputs);
    }

    return true;
  }

  private handleKeyEvent(event: KeyboardEvent): void {
    const keyString = this.eventToKeyString(event);
    
    // Handle command palette first
    if (this.paletteState.value.isOpen) {
      this.handlePaletteKeyEvent(event);
      return;
    }

    // Add to sequence
    this.keySequence.push(keyString);
    
    // Check for immediate matches
    const matchingShortcuts = this.getMatchingShortcuts(event);
    const exactMatch = matchingShortcuts.find(shortcut => 
      this.isExactMatch(shortcut, this.keySequence)
    );

    if (exactMatch && exactMatch.enabled) {
      if (exactMatch.preventDefault) {
        event.preventDefault();
      }
      
      this.executeShortcut(exactMatch);
      this.keySequence = [];
      this.clearSequenceTimeout();
    } else {
      // Check if any shortcuts could potentially match with more keys
      const potentialMatches = matchingShortcuts.filter(shortcut =>
        this.isPartialMatch(shortcut, this.keySequence)
      );

      if (potentialMatches.length === 0) {
        this.keySequence = [keyString]; // Reset and try again with just this key
      }
    }

    this.resetSequenceTimeout();
  }

  private handlePaletteKeyEvent(event: KeyboardEvent): void {
    const palette = this.paletteState.value;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closePalette();
        break;

      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = Math.min(
          palette.selectedIndex + 1,
          palette.filteredShortcuts.length - 1
        );
        this.updatePalette({ selectedIndex: nextIndex });
        break;

      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = Math.max(palette.selectedIndex - 1, 0);
        this.updatePalette({ selectedIndex: prevIndex });
        break;

      case 'Enter':
        event.preventDefault();
        if (palette.filteredShortcuts[palette.selectedIndex]) {
          this.executeShortcut(palette.filteredShortcuts[palette.selectedIndex]);
          this.closePalette();
        }
        break;
    }
  }

  private eventToKeyString(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    
    // Handle special keys
    const key = event.key.toLowerCase();
    if (key !== 'control' && key !== 'alt' && key !== 'shift' && key !== 'meta') {
      parts.push(key);
    }

    return parts.join('+');
  }

  private getMatchingShortcuts(event?: KeyboardEvent): KeyboardShortcut[] {
    const allShortcuts = [
      ...this.shortcuts.value,
      ...Array.from(this.customShortcuts.values())
    ];

    return allShortcuts.filter(shortcut => {
      // Context filter
      if (shortcut.context && shortcut.context !== this.currentContext) {
        return false;
      }

      // Input element filter
      if (event && !shortcut.allowInInputs) {
        const target = event.target as HTMLElement;
        const isInputElement = target.tagName === 'INPUT' || 
                              target.tagName === 'TEXTAREA' || 
                              target.contentEditable === 'true';
        if (isInputElement) return false;
      }

      return shortcut.enabled;
    });
  }

  private isExactMatch(shortcut: KeyboardShortcut, sequence: string[]): boolean {
    if (shortcut.keys.length !== sequence.length) return false;
    
    return shortcut.keys.every((key, index) => {
      return this.normalizeKey(key) === this.normalizeKey(sequence[index]);
    });
  }

  private isPartialMatch(shortcut: KeyboardShortcut, sequence: string[]): boolean {
    if (sequence.length >= shortcut.keys.length) return false;
    
    return sequence.every((key, index) => {
      return this.normalizeKey(shortcut.keys[index]) === this.normalizeKey(key);
    });
  }

  private normalizeKey(key: string): string {
    return key.toLowerCase().replace(/\s+/g, '');
  }

  private executeShortcut(shortcut: KeyboardShortcut): void {
    try {
      shortcut.action();
      this.recordShortcutUsage(shortcut.id);
      this.addToRecentShortcuts(shortcut.id);
      
      // Track with interaction service
      this.interactionService.recordInteraction(
        'shortcut_used',
        shortcut.context || 'global',
        true
      );
    } catch (error) {
      console.error('Error executing shortcut:', shortcut.id, error);
    }
  }

  private resetSequenceTimeout(): void {
    this.clearSequenceTimeout();
    this.sequenceTimeout = setTimeout(() => {
      this.keySequence = [];
    }, 2000); // 2 second timeout for key sequences
  }

  private clearSequenceTimeout(): void {
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
      this.sequenceTimeout = null;
    }
  }

  // Public API
  setContext(context: string): void {
    this.currentContext = context;
  }

  getShortcutsForContext(context?: string): KeyboardShortcut[] {
    const targetContext = context || this.currentContext;
    return this.getMatchingShortcuts().filter(shortcut =>
      !shortcut.context || shortcut.context === targetContext || shortcut.context === 'global'
    );
  }

  getShortcutsByCategory(): ShortcutCategory[] {
    const shortcuts = this.getShortcutsForContext();
    const categories: { [key: string]: ShortcutCategory } = {};

    shortcuts.forEach(shortcut => {
      if (!categories[shortcut.category]) {
        categories[shortcut.category] = {
          name: shortcut.category,
          label: this.getCategoryLabel(shortcut.category),
          icon: this.getCategoryIcon(shortcut.category),
          shortcuts: []
        };
      }
      categories[shortcut.category].shortcuts.push(shortcut);
    });

    return Object.values(categories);
  }

  private getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      navigation: 'Navigation',
      editing: 'Editing',
      selection: 'Selection',
      workflow: 'Workflow',
      global: 'Global'
    };
    return labels[category] || category;
  }

  private getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      navigation: 'navigation',
      editing: 'edit',
      selection: 'check_box',
      workflow: 'workflow',
      global: 'settings'
    };
    return icons[category] || 'keyboard';
  }

  toggleCommandPalette(): void {
    const isOpen = this.paletteState.value.isOpen;
    if (isOpen) {
      this.closePalette();
    } else {
      this.openPalette();
    }
  }

  private openPalette(): void {
    const shortcuts = this.getShortcutsForContext();
    this.updatePalette({
      isOpen: true,
      query: '',
      filteredShortcuts: shortcuts,
      selectedIndex: 0
    });
  }

  private closePalette(): void {
    this.updatePalette({
      isOpen: false,
      query: '',
      filteredShortcuts: [],
      selectedIndex: 0
    });
  }

  filterPalette(query: string): void {
    const allShortcuts = this.getShortcutsForContext();
    const filtered = allShortcuts.filter(shortcut =>
      shortcut.name.toLowerCase().includes(query.toLowerCase()) ||
      shortcut.description.toLowerCase().includes(query.toLowerCase()) ||
      shortcut.keys.some(key => key.toLowerCase().includes(query.toLowerCase()))
    );

    this.updatePalette({
      query,
      filteredShortcuts: filtered,
      selectedIndex: 0
    });
  }

  private updatePalette(updates: Partial<ShortcutPalette>): void {
    const current = this.paletteState.value;
    this.paletteState.next({ ...current, ...updates });
  }

  // Custom shortcuts
  addCustomShortcut(shortcut: Omit<KeyboardShortcut, 'id'>): void {
    const id = `custom_${Date.now()}`;
    const customShortcut: KeyboardShortcut = { ...shortcut, id };
    this.customShortcuts.set(id, customShortcut);
    this.saveCustomShortcuts();
  }

  removeCustomShortcut(id: string): void {
    this.customShortcuts.delete(id);
    this.saveCustomShortcuts();
  }

  private recordShortcutUsage(shortcutId: string): void {
    const current = this.shortcutUsage.get(shortcutId) || 0;
    this.shortcutUsage.set(shortcutId, current + 1);
  }

  private addToRecentShortcuts(shortcutId: string): void {
    this.recentShortcuts = [
      shortcutId,
      ...this.recentShortcuts.filter(id => id !== shortcutId)
    ].slice(0, 10);
  }

  getPopularShortcuts(): KeyboardShortcut[] {
    const allShortcuts = [
      ...this.shortcuts.value,
      ...Array.from(this.customShortcuts.values())
    ];

    return allShortcuts
      .map(shortcut => ({
        shortcut,
        usage: this.shortcutUsage.get(shortcut.id) || 0
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10)
      .map(({ shortcut }) => shortcut);
  }

  private saveCustomShortcuts(): void {
    try {
      const shortcuts = Array.from(this.customShortcuts.values());
      localStorage.setItem('custom_shortcuts', JSON.stringify(shortcuts));
    } catch (error) {
      console.warn('Failed to save custom shortcuts:', error);
    }
  }

  private loadCustomShortcuts(): void {
    try {
      const stored = localStorage.getItem('custom_shortcuts');
      if (stored) {
        const shortcuts: KeyboardShortcut[] = JSON.parse(stored);
        shortcuts.forEach(shortcut => {
          this.customShortcuts.set(shortcut.id, shortcut);
        });
      }
    } catch (error) {
      console.warn('Failed to load custom shortcuts:', error);
    }
  }

  // Action implementations (these would be implemented based on your app's architecture)
  private navigateTo(path: string): void {
    // Implementation depends on your routing setup
    console.log('Navigate to:', path);
  }

  private openGlobalSearch(): void {
    // Emit event or call service
    console.log('Open global search');
  }

  private showHelp(): void {
    console.log('Show help');
  }

  private triggerFileUpload(): void {
    const uploadButton = document.querySelector('[data-shortcut="upload"]') as HTMLElement;
    uploadButton?.click();
  }

  private startBatchProcessing(): void {
    const processButton = document.querySelector('[data-shortcut="process-batch"]') as HTMLElement;
    processButton?.click();
  }

  private quickScore(): void {
    console.log('Quick score');
  }

  private openTagDialog(): void {
    console.log('Open tag dialog');
  }

  private nextResume(): void {
    console.log('Next resume');
  }

  private previousResume(): void {
    console.log('Previous resume');
  }

  private approveCandidate(): void {
    console.log('Approve candidate');
  }

  private rejectCandidate(): void {
    console.log('Reject candidate');
  }

  private focusSearch(): void {
    const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
    searchInput?.focus();
  }

  private clearFilters(): void {
    console.log('Clear filters');
  }

  private saveSearch(): void {
    console.log('Save search');
  }

  private selectAll(): void {
    console.log('Select all');
  }

  private openBulkActions(): void {
    console.log('Open bulk actions');
  }

  private refreshDashboard(): void {
    console.log('Refresh dashboard');
  }

  private toggleSidebar(): void {
    console.log('Toggle sidebar');
  }

  private skipToContent(): void {
    const mainContent = document.querySelector('main') as HTMLElement;
    mainContent?.focus();
  }

  private toggleHighContrast(): void {
    document.body.classList.toggle('high-contrast');
  }

  // Getters
  get paletteState$(): Observable<ShortcutPalette> {
    return this.paletteState.asObservable();
  }

  get shortcuts$(): Observable<KeyboardShortcut[]> {
    return this.shortcuts.asObservable();
  }
}