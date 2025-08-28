import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, debounceTime } from 'rxjs/operators';
import { InteractionService } from '../core/interaction.service';

export interface HelpContent {
  id: string;
  title: string;
  content: string;
  type: 'tooltip' | 'guide' | 'tutorial' | 'hint' | 'warning';
  context: string;
  triggers: HelpTrigger[];
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  priority: number;
  conditions?: HelpCondition[];
  actions?: HelpAction[];
}

export interface HelpTrigger {
  type: 'hover' | 'focus' | 'click' | 'idle' | 'error' | 'first_visit' | 'behavior_pattern';
  delay?: number;
  selector?: string;
  condition?: string;
}

export interface HelpCondition {
  type: 'user_role' | 'feature_usage' | 'time_spent' | 'error_count' | 'completion_rate';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

export interface HelpAction {
  type: 'highlight' | 'scroll_to' | 'open_modal' | 'navigate' | 'track_event';
  target?: string;
  data?: any;
}

export interface UserHelpState {
  dismissedHelp: Set<string>;
  completedTutorials: Set<string>;
  helpPreferences: {
    showTooltips: boolean;
    showTutorials: boolean;
    autoGuide: boolean;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  };
  behaviorData: {
    timeSpent: { [context: string]: number };
    errorCount: { [context: string]: number };
    completionRate: { [context: string]: number };
    featureUsage: { [feature: string]: number };
  };
}

@Injectable({
  providedIn: 'root'
})
export class ContextualHelpService {
  private helpContent = new BehaviorSubject<HelpContent[]>([]);
  private userState = new BehaviorSubject<UserHelpState>(this.getInitialUserState());
  private activeHelp = new BehaviorSubject<HelpContent[]>([]);
  private currentContext = new BehaviorSubject<string>('general');

  constructor(private interactionService: InteractionService) {
    this.initializeHelpContent();
    this.setupBehaviorTracking();
    this.loadUserState();
  }

  private getInitialUserState(): UserHelpState {
    return {
      dismissedHelp: new Set(),
      completedTutorials: new Set(),
      helpPreferences: {
        showTooltips: true,
        showTutorials: true,
        autoGuide: true,
        difficulty: 'beginner'
      },
      behaviorData: {
        timeSpent: {},
        errorCount: {},
        completionRate: {},
        featureUsage: {}
      }
    };
  }

  private initializeHelpContent(): void {
    const content: HelpContent[] = [
      // File Upload Help
      {
        id: 'file_upload_intro',
        title: 'Smart File Upload',
        content: 'Drag and drop files or click to browse. Our AI will automatically categorize your uploads and suggest the best processing options.',
        type: 'guide',
        context: 'file_upload',
        triggers: [{ type: 'first_visit' }],
        priority: 10,
        conditions: [
          { type: 'user_role', operator: 'equals', value: 'recruiter' }
        ]
      },

      {
        id: 'batch_processing_tip',
        title: 'Batch Processing Available',
        content: 'You can upload multiple resumes at once for faster processing. Perfect for high-volume recruiting!',
        type: 'hint',
        context: 'file_upload',
        triggers: [
          { type: 'behavior_pattern', condition: 'multiple_single_uploads' }
        ],
        priority: 8
      },

      // Resume Analysis Help
      {
        id: 'scoring_explanation',
        title: 'How Resume Scoring Works',
        content: 'Our AI analyzes skills, experience, and job fit to provide a comprehensive score. Click on any score to see detailed breakdown.',
        type: 'tooltip',
        context: 'resume_analysis',
        triggers: [{ type: 'hover', selector: '.score-badge' }],
        priority: 7
      },

      {
        id: 'quick_actions_guide',
        title: 'Quick Actions',
        content: 'Use keyboard shortcuts to speed up your workflow: Ctrl+Q for quick score, Ctrl+T for tagging, Ctrl+S for saved searches.',
        type: 'tutorial',
        context: 'resume_review',
        triggers: [
          { type: 'behavior_pattern', condition: 'slow_processing_speed' }
        ],
        priority: 9,
        conditions: [
          { type: 'feature_usage', operator: 'less_than', value: 5 }
        ]
      },

      // Dashboard Help
      {
        id: 'dashboard_customization',
        title: 'Customize Your Dashboard',
        content: 'Drag widgets to rearrange them. Right-click for more options like resizing and filtering.',
        type: 'guide',
        context: 'dashboard',
        triggers: [{ type: 'first_visit' }],
        priority: 6
      },

      {
        id: 'real_time_updates',
        title: 'Real-time Updates',
        content: 'Your dashboard updates automatically as new candidates are processed. Green indicators show fresh data.',
        type: 'hint',
        context: 'dashboard',
        triggers: [{ type: 'idle', delay: 5000 }],
        priority: 5
      },

      // Search Help
      {
        id: 'advanced_search_intro',
        title: 'Advanced Search Features',
        content: 'Use natural language queries like "JavaScript developers with 3+ years in startups" or combine filters for precise results.',
        type: 'tutorial',
        context: 'candidate_search',
        triggers: [
          { type: 'behavior_pattern', condition: 'basic_search_only' }
        ],
        priority: 8
      },

      {
        id: 'saved_searches_tip',
        title: 'Save Frequent Searches',
        content: 'Click the bookmark icon to save searches you use often. They\'ll appear in your quick access menu.',
        type: 'hint',
        context: 'candidate_search',
        triggers: [
          { type: 'behavior_pattern', condition: 'repeated_searches' }
        ],
        priority: 7
      },

      // Error Recovery Help
      {
        id: 'upload_error_help',
        title: 'Upload Issues?',
        content: 'If files fail to upload, check the file size (max 50MB) and format. PDF and Word documents work best.',
        type: 'warning',
        context: 'file_upload',
        triggers: [{ type: 'error' }],
        priority: 10
      },

      {
        id: 'performance_optimization',
        title: 'Optimize Performance',
        content: 'For faster processing, close unused browser tabs and ensure stable internet connection.',
        type: 'hint',
        context: 'general',
        triggers: [
          { type: 'behavior_pattern', condition: 'slow_performance' }
        ],
        priority: 6
      }
    ];

    this.helpContent.next(content);
  }

  private setupBehaviorTracking(): void {
    // Track context changes
    this.interactionService.currentState.pipe(
      debounceTime(1000)
    ).subscribe(state => {
      this.updateContext(state.currentTask || 'general');
      this.trackTimeSpent(state.currentTask || 'general');
    });

    // Update active help based on context and user state
    combineLatest([
      this.helpContent,
      this.currentContext,
      this.userState
    ]).pipe(
      map(([content, context, userState]) => 
        this.filterRelevantHelp(content, context, userState)
      )
    ).subscribe(relevantHelp => {
      this.activeHelp.next(relevantHelp);
    });
  }

  private filterRelevantHelp(
    content: HelpContent[],
    context: string,
    userState: UserHelpState
  ): HelpContent[] {
    return content
      .filter(help => {
        // Context match
        if (help.context !== context && help.context !== 'general') {
          return false;
        }

        // Not dismissed
        if (userState.dismissedHelp.has(help.id)) {
          return false;
        }

        // Check conditions
        if (help.conditions && !this.evaluateConditions(help.conditions, userState)) {
          return false;
        }

        // User preferences
        if (!userState.helpPreferences.showTooltips && help.type === 'tooltip') {
          return false;
        }

        if (!userState.helpPreferences.showTutorials && help.type === 'tutorial') {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.priority - a.priority);
  }

  private evaluateConditions(conditions: HelpCondition[], userState: UserHelpState): boolean {
    return conditions.every(condition => {
      const { type, operator, value } = condition;
      let actualValue: any;

      switch (type) {
        case 'user_role':
          // Get from interaction service
          return true; // Simplified for now
        
        case 'feature_usage':
          actualValue = Object.values(userState.behaviorData.featureUsage)
            .reduce((sum, count) => sum + count, 0);
          break;

        case 'time_spent':
          actualValue = Object.values(userState.behaviorData.timeSpent)
            .reduce((sum, time) => sum + time, 0);
          break;

        case 'error_count':
          actualValue = Object.values(userState.behaviorData.errorCount)
            .reduce((sum, count) => sum + count, 0);
          break;

        case 'completion_rate':
          const rates = Object.values(userState.behaviorData.completionRate);
          actualValue = rates.length > 0 ? 
            rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;
          break;

        default:
          return true;
      }

      switch (operator) {
        case 'equals':
          return actualValue === value;
        case 'greater_than':
          return actualValue > value;
        case 'less_than':
          return actualValue < value;
        case 'contains':
          return String(actualValue).includes(String(value));
        default:
          return false;
      }
    });
  }

  // Public methods
  updateContext(context: string): void {
    this.currentContext.next(context);
  }

  getHelpForContext(context: string): Observable<HelpContent[]> {
    return combineLatest([
      this.helpContent,
      this.userState
    ]).pipe(
      map(([content, userState]) => 
        this.filterRelevantHelp(content, context, userState)
      )
    );
  }

  getHelpById(helpId: string): HelpContent | undefined {
    return this.helpContent.value.find(help => help.id === helpId);
  }

  dismissHelp(helpId: string): void {
    const userState = this.userState.value;
    userState.dismissedHelp.add(helpId);
    this.userState.next({ ...userState });
    this.saveUserState();

    // Track dismissal
    this.interactionService.recordInteraction('help_dismissed', 'contextual_help', true);
  }

  completeeTutorial(tutorialId: string): void {
    const userState = this.userState.value;
    userState.completedTutorials.add(tutorialId);
    this.userState.next({ ...userState });
    this.saveUserState();

    // Track completion
    this.interactionService.recordInteraction('tutorial_completed', 'contextual_help', true);
  }

  updatePreferences(preferences: Partial<UserHelpState['helpPreferences']>): void {
    const userState = this.userState.value;
    userState.helpPreferences = { ...userState.helpPreferences, ...preferences };
    this.userState.next({ ...userState });
    this.saveUserState();
  }

  recordFeatureUsage(feature: string): void {
    const userState = this.userState.value;
    const current = userState.behaviorData.featureUsage[feature] || 0;
    userState.behaviorData.featureUsage[feature] = current + 1;
    this.userState.next({ ...userState });
    this.saveUserState();
  }

  recordError(context: string): void {
    const userState = this.userState.value;
    const current = userState.behaviorData.errorCount[context] || 0;
    userState.behaviorData.errorCount[context] = current + 1;
    this.userState.next({ ...userState });
    this.saveUserState();
  }

  recordCompletion(context: string, rate: number): void {
    const userState = this.userState.value;
    userState.behaviorData.completionRate[context] = rate;
    this.userState.next({ ...userState });
    this.saveUserState();
  }

  private trackTimeSpent(context: string): void {
    const userState = this.userState.value;
    const current = userState.behaviorData.timeSpent[context] || 0;
    userState.behaviorData.timeSpent[context] = current + 1;
    this.userState.next({ ...userState });
  }

  triggerHelp(triggerId: string, data?: any): void {
    const relevantHelp = this.helpContent.value.filter(help =>
      help.triggers.some(trigger => 
        trigger.type === 'click' && trigger.selector === triggerId
      )
    );

    if (relevantHelp.length > 0) {
      // Emit help trigger event
      this.interactionService.recordInteraction('help_triggered', 'contextual_help', true);
    }
  }

  // Intelligent suggestions
  suggestNextSteps(context: string): Observable<string[]> {
    return this.interactionService.getPredictiveActions(context).pipe(
      map(actions => actions.map(action => action.suggestion))
    );
  }

  checkForBehaviorPatterns(): void {
    const userState = this.userState.value;
    
    // Check for patterns that should trigger help
    this.detectSlowProcessingPattern(userState);
    this.detectRepeatedSearchPattern(userState);
    this.detectMultipleUploadPattern(userState);
  }

  private detectSlowProcessingPattern(userState: UserHelpState): void {
    const avgTimeSpent = Object.values(userState.behaviorData.timeSpent)
      .reduce((sum, time) => sum + time, 0) / 
      Object.keys(userState.behaviorData.timeSpent).length;

    if (avgTimeSpent > 30) { // More than 30 time units
      // Trigger efficiency help
      this.triggerHelp('slow_processing_speed');
    }
  }

  private detectRepeatedSearchPattern(userState: UserHelpState): void {
    const searchUsage = userState.behaviorData.featureUsage['search'] || 0;
    const savedSearchUsage = userState.behaviorData.featureUsage['saved_search'] || 0;

    if (searchUsage > 10 && savedSearchUsage === 0) {
      this.triggerHelp('repeated_searches');
    }
  }

  private detectMultipleUploadPattern(userState: UserHelpState): void {
    const uploadUsage = userState.behaviorData.featureUsage['single_upload'] || 0;
    const batchUsage = userState.behaviorData.featureUsage['batch_upload'] || 0;

    if (uploadUsage > 5 && batchUsage === 0) {
      this.triggerHelp('multiple_single_uploads');
    }
  }

  private saveUserState(): void {
    try {
      const state = this.userState.value;
      const serializedState = {
        ...state,
        dismissedHelp: Array.from(state.dismissedHelp),
        completedTutorials: Array.from(state.completedTutorials)
      };
      localStorage.setItem('contextual_help_state', JSON.stringify(serializedState));
    } catch (error) {
      console.warn('Failed to save help state:', error);
    }
  }

  private loadUserState(): void {
    try {
      const stored = localStorage.getItem('contextual_help_state');
      if (stored) {
        const state = JSON.parse(stored);
        const userState = {
          ...state,
          dismissedHelp: new Set(state.dismissedHelp || []),
          completedTutorials: new Set(state.completedTutorials || [])
        };
        this.userState.next(userState);
      }
    } catch (error) {
      console.warn('Failed to load help state:', error);
    }
  }

  // Getters
  get activeHelp$(): Observable<HelpContent[]> {
    return this.activeHelp.asObservable();
  }

  get userState$(): Observable<UserHelpState> {
    return this.userState.asObservable();
  }

  get currentContext$(): Observable<string> {
    return this.currentContext.asObservable();
  }
}