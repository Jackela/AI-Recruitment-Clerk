import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface UserBehaviorPattern {
  action: string;
  context: string;
  frequency: number;
  lastUsed: Date;
  success_rate: number;
}

export interface PredictiveAction {
  action: string;
  confidence: number;
  context: any;
  suggestion: string;
  shortcut?: string;
}

export interface InteractionState {
  currentTask: string;
  userRole: 'recruiter' | 'hr_manager' | 'job_seeker' | 'admin';
  workflowStage: string;
  recentActions: string[];
  contextData: any;
}

@Injectable({
  providedIn: 'root'
})
export class InteractionService {
  private behaviorPatterns = new BehaviorSubject<UserBehaviorPattern[]>([]);
  private interactionState = new BehaviorSubject<InteractionState>({
    currentTask: '',
    userRole: 'recruiter',
    workflowStage: 'initial',
    recentActions: [],
    contextData: {}
  });

  private learningData = new Map<string, any>();
  private predictiveCache = new Map<string, PredictiveAction[]>();

  constructor() {
    this.initializeLearningEngine();
  }

  /**
   * Intelligent Prediction Engine
   */
  getPredictiveActions(context: string): Observable<PredictiveAction[]> {
    return combineLatest([
      this.behaviorPatterns.asObservable(),
      this.interactionState.asObservable()
    ]).pipe(
      debounceTime(150),
      map(([patterns, state]) => this.calculatePredictions(patterns, state, context)),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    );
  }

  private calculatePredictions(
    patterns: UserBehaviorPattern[],
    state: InteractionState,
    context: string
  ): PredictiveAction[] {
    const cacheKey = `${context}_${state.userRole}_${state.workflowStage}`;
    
    if (this.predictiveCache.has(cacheKey)) {
      return this.predictiveCache.get(cacheKey)!;
    }

    const predictions: PredictiveAction[] = [];

    // Role-based predictions
    switch (state.userRole) {
      case 'recruiter':
        predictions.push(...this.getRecruiterPredictions(state, context));
        break;
      case 'hr_manager':
        predictions.push(...this.getHRManagerPredictions(state, context));
        break;
      case 'job_seeker':
        predictions.push(...this.getJobSeekerPredictions(state, context));
        break;
    }

    // Context-based predictions
    predictions.push(...this.getContextualPredictions(patterns, context));

    // Sort by confidence and return top 5
    const sortedPredictions = predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    this.predictiveCache.set(cacheKey, sortedPredictions);
    return sortedPredictions;
  }

  private getRecruiterPredictions(state: InteractionState, context: string): PredictiveAction[] {
    const predictions: PredictiveAction[] = [];

    if (context === 'resume_review') {
      predictions.push({
        action: 'quick_score',
        confidence: 0.9,
        context: { workflow: 'high_volume_processing' },
        suggestion: 'Quick score this candidate',
        shortcut: 'Ctrl+Q'
      });

      predictions.push({
        action: 'batch_process',
        confidence: 0.85,
        context: { workflow: 'bulk_operations' },
        suggestion: 'Process multiple resumes',
        shortcut: 'Ctrl+B'
      });

      predictions.push({
        action: 'smart_tag',
        confidence: 0.8,
        context: { ml_driven: true },
        suggestion: 'Auto-tag skills and experience',
        shortcut: 'Ctrl+T'
      });
    }

    if (context === 'candidate_search') {
      predictions.push({
        action: 'saved_search',
        confidence: 0.88,
        context: { personalized: true },
        suggestion: 'Use your frequent search patterns',
        shortcut: 'Ctrl+S'
      });
    }

    return predictions;
  }

  private getHRManagerPredictions(state: InteractionState, context: string): PredictiveAction[] {
    const predictions: PredictiveAction[] = [];

    if (context === 'dashboard') {
      predictions.push({
        action: 'generate_report',
        confidence: 0.92,
        context: { intelligent_automation: true },
        suggestion: 'Generate automated insights report',
        shortcut: 'Ctrl+R'
      });

      predictions.push({
        action: 'team_analytics',
        confidence: 0.87,
        context: { management_focus: true },
        suggestion: 'View team performance analytics',
        shortcut: 'Ctrl+A'
      });
    }

    return predictions;
  }

  private getJobSeekerPredictions(state: InteractionState, context: string): PredictiveAction[] {
    const predictions: PredictiveAction[] = [];

    if (context === 'profile_update') {
      predictions.push({
        action: 'skill_recommendations',
        confidence: 0.9,
        context: { guidance_focused: true },
        suggestion: 'Get AI-powered skill recommendations',
        shortcut: 'Ctrl+K'
      });

      predictions.push({
        action: 'resume_optimization',
        confidence: 0.85,
        context: { feedback_clarity: true },
        suggestion: 'Optimize resume for better matching',
        shortcut: 'Ctrl+O'
      });
    }

    return predictions;
  }

  private getContextualPredictions(patterns: UserBehaviorPattern[], context: string): PredictiveAction[] {
    return patterns
      .filter(pattern => pattern.context === context && pattern.success_rate > 0.7)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3)
      .map(pattern => ({
        action: pattern.action,
        confidence: pattern.success_rate * 0.8,
        context: { learned: true },
        suggestion: `Based on your usage: ${pattern.action}`,
        shortcut: this.getShortcutForAction(pattern.action)
      }));
  }

  /**
   * Learning Engine
   */
  recordInteraction(action: string, context: string, success: boolean): void {
    const patterns = this.behaviorPatterns.value;
    const existingPattern = patterns.find(p => p.action === action && p.context === context);

    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastUsed = new Date();
      existingPattern.success_rate = (existingPattern.success_rate + (success ? 1 : 0)) / 2;
    } else {
      patterns.push({
        action,
        context,
        frequency: 1,
        lastUsed: new Date(),
        success_rate: success ? 1 : 0
      });
    }

    this.behaviorPatterns.next(patterns);
    this.clearPredictiveCache();
  }

  updateInteractionState(updates: Partial<InteractionState>): void {
    const currentState = this.interactionState.value;
    const newState = { ...currentState, ...updates };
    
    // Update recent actions
    if (updates.currentTask) {
      newState.recentActions = [
        updates.currentTask,
        ...currentState.recentActions.slice(0, 4)
      ];
    }

    this.interactionState.next(newState);
  }

  /**
   * Smart Autocomplete & Suggestions
   */
  getSmartSuggestions(input: string, context: string): Observable<string[]> {
    return new Observable(observer => {
      const suggestions = this.generateSmartSuggestions(input, context);
      observer.next(suggestions);
      observer.complete();
    });
  }

  private generateSmartSuggestions(input: string, context: string): string[] {
    const suggestions: string[] = [];
    const lowercaseInput = input.toLowerCase();

    // Context-specific suggestions
    if (context === 'job_title') {
      const jobTitles = [
        'Software Engineer', 'Product Manager', 'Data Scientist',
        'UX Designer', 'DevOps Engineer', 'Frontend Developer',
        'Backend Developer', 'Full Stack Developer', 'ML Engineer'
      ];
      suggestions.push(...jobTitles.filter(title => 
        title.toLowerCase().includes(lowercaseInput)
      ));
    }

    if (context === 'skills') {
      const skills = [
        'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue.js',
        'Node.js', 'Python', 'Java', 'C#', 'Go', 'Rust',
        'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP'
      ];
      suggestions.push(...skills.filter(skill => 
        skill.toLowerCase().includes(lowercaseInput)
      ));
    }

    return suggestions.slice(0, 8);
  }

  /**
   * Performance Optimization
   */
  private clearPredictiveCache(): void {
    this.predictiveCache.clear();
  }

  private getShortcutForAction(action: string): string | undefined {
    const shortcuts: { [key: string]: string } = {
      'quick_score': 'Ctrl+Q',
      'batch_process': 'Ctrl+B',
      'smart_tag': 'Ctrl+T',
      'saved_search': 'Ctrl+S',
      'generate_report': 'Ctrl+R',
      'team_analytics': 'Ctrl+A'
    };
    return shortcuts[action];
  }

  private initializeLearningEngine(): void {
    // Initialize with common patterns based on user roles
    const initialPatterns: UserBehaviorPattern[] = [
      {
        action: 'quick_score',
        context: 'resume_review',
        frequency: 10,
        lastUsed: new Date(),
        success_rate: 0.85
      },
      {
        action: 'batch_process',
        context: 'resume_review',
        frequency: 8,
        lastUsed: new Date(),
        success_rate: 0.9
      }
    ];

    this.behaviorPatterns.next(initialPatterns);
  }

  /**
   * Public Getters
   */
  get currentState(): Observable<InteractionState> {
    return this.interactionState.asObservable();
  }

  get userPatterns(): Observable<UserBehaviorPattern[]> {
    return this.behaviorPatterns.asObservable();
  }
}