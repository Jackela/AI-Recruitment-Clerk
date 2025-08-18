import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { Subject, BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, map, startWith } from 'rxjs/operators';
import { InteractionService } from '../core/interaction.service';

export interface AutocompleteSuggestion {
  id: string;
  value: string;
  label: string;
  category?: string;
  confidence: number;
  metadata?: any;
  icon?: string;
  description?: string;
}

export interface PredictiveConfig {
  context: string;
  minLength: number;
  maxSuggestions: number;
  debounceMs: number;
  showConfidence: boolean;
  groupByCategory: boolean;
  enableLearning: boolean;
  allowCustom: boolean;
}

@Component({
  selector: 'app-predictive-autocomplete',
  templateUrl: './predictive-autocomplete.component.html',
  styleUrls: ['./predictive-autocomplete.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PredictiveAutocompleteComponent),
      multi: true
    }
  ],
  animations: [
    trigger('dropdownSlide', [
      state('closed', style({ opacity: 0, transform: 'translateY(-10px)' })),
      state('open', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('closed => open', animate('200ms cubic-bezier(0.4, 0, 0.2, 1)')),
      transition('open => closed', animate('150ms ease-in-out'))
    ]),

    trigger('suggestionEnter', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(50, [
            animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', 
              style({ opacity: 1, transform: 'translateX(0)' })
            )
          ])
        ], { optional: true })
      ])
    ]),

    trigger('highlight', [
      state('default', style({ backgroundColor: 'transparent' })),
      state('highlighted', style({ backgroundColor: 'var(--primary-50)' })),
      transition('default <=> highlighted', animate('150ms ease-in-out'))
    ])
  ]
})
export class PredictiveAutocompleteComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() config: PredictiveConfig = {
    context: 'general',
    minLength: 2,
    maxSuggestions: 8,
    debounceMs: 300,
    showConfidence: false,
    groupByCategory: false,
    enableLearning: true,
    allowCustom: true
  };

  @Input() placeholder = 'Start typing...';
  @Input() disabled = false;
  @Input() required = false;
  @Input() customSuggestions: AutocompleteSuggestion[] = [];

  @Output() suggestionSelected = new EventEmitter<AutocompleteSuggestion>();
  @Output() inputChange = new EventEmitter<string>();
  @Output() customValueEntered = new EventEmitter<string>();

  @ViewChild('input', { static: true }) inputElement!: ElementRef<HTMLInputElement>;
  @ViewChild('dropdown', { static: false }) dropdownElement!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  private inputValue$ = new BehaviorSubject<string>('');
  private suggestions$ = new BehaviorSubject<AutocompleteSuggestion[]>([]);

  // Component state
  isOpen = false;
  isLoading = false;
  highlightedIndex = -1;
  value = '';

  // ControlValueAccessor
  private onChange = (value: string) => {};
  private onTouched = () => {};

  // Predictive data
  private userPatterns: Map<string, number> = new Map();
  private recentSelections: string[] = [];

  constructor(private interactionService: InteractionService) {}

  ngOnInit(): void {
    this.setupPredictiveEngine();
    this.setupKeyboardNavigation();
    this.loadUserPatterns();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupPredictiveEngine(): void {
    // Combine input changes with intelligent suggestions
    const intelligentSuggestions$ = this.inputValue$.pipe(
      debounceTime(this.config.debounceMs),
      distinctUntilChanged(),
      switchMap(query => this.generateIntelligentSuggestions(query))
    );

    // Custom suggestions from input
    const customSuggestions$ = new BehaviorSubject(this.customSuggestions);

    // Combine all suggestion sources
    combineLatest([
      intelligentSuggestions$,
      customSuggestions$,
      this.interactionService.getPredictiveActions(this.config.context)
    ]).pipe(
      takeUntil(this.destroy$),
      map(([intelligent, custom, predictive]) => 
        this.mergeSuggestions(intelligent, custom, predictive)
      )
    ).subscribe(suggestions => {
      this.suggestions$.next(suggestions);
      this.isLoading = false;
    });

    // Update dropdown visibility based on suggestions
    this.suggestions$.pipe(
      takeUntil(this.destroy$),
      map(suggestions => suggestions.length > 0 && this.value.length >= this.config.minLength)
    ).subscribe(shouldShow => {
      this.isOpen = shouldShow && !this.disabled;
    });
  }

  private async generateIntelligentSuggestions(query: string): Promise<AutocompleteSuggestion[]> {
    if (query.length < this.config.minLength) {
      return [];
    }

    this.isLoading = true;
    const suggestions: AutocompleteSuggestion[] = [];

    // Context-based suggestions
    const contextSuggestions = await this.getContextualSuggestions(query);
    suggestions.push(...contextSuggestions);

    // Pattern-based suggestions from user history
    const patternSuggestions = this.getPatternBasedSuggestions(query);
    suggestions.push(...patternSuggestions);

    // Smart autocomplete from interaction service
    const smartSuggestions = await this.interactionService
      .getSmartSuggestions(query, this.config.context)
      .toPromise();

    if (smartSuggestions) {
      const mappedSuggestions = smartSuggestions.map((suggestion, index) => ({
        id: `smart_${index}`,
        value: suggestion,
        label: suggestion,
        confidence: 0.8 - (index * 0.1),
        category: 'smart'
      }));
      suggestions.push(...mappedSuggestions);
    }

    // Sort by confidence and limit results
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxSuggestions);
  }

  private async getContextualSuggestions(query: string): Promise<AutocompleteSuggestion[]> {
    const suggestions: AutocompleteSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    // Context-specific suggestion databases
    const databases = {
      job_title: [
        'Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer',
        'DevOps Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
        'Machine Learning Engineer', 'Technical Lead', 'Engineering Manager'
      ],
      skills: [
        'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue.js', 'Node.js',
        'Python', 'Java', 'C#', 'Go', 'Rust', 'Docker', 'Kubernetes',
        'AWS', 'Azure', 'GCP', 'MongoDB', 'PostgreSQL', 'Redis'
      ],
      company: [
        'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix',
        'Spotify', 'Uber', 'Airbnb', 'Tesla', 'SpaceX', 'OpenAI'
      ],
      location: [
        'San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX',
        'Boston, MA', 'Los Angeles, CA', 'Chicago, IL', 'Remote'
      ]
    };

    const contextData = databases[this.config.context as keyof typeof databases] || [];

    contextData
      .filter(item => item.toLowerCase().includes(lowerQuery))
      .forEach((item, index) => {
        const matchIndex = item.toLowerCase().indexOf(lowerQuery);
        const exactMatch = matchIndex === 0;
        
        suggestions.push({
          id: `context_${index}`,
          value: item,
          label: item,
          confidence: exactMatch ? 0.95 : 0.8 - (matchIndex * 0.1),
          category: this.config.context,
          metadata: { source: 'contextual' }
        });
      });

    return suggestions;
  }

  private getPatternBasedSuggestions(query: string): AutocompleteSuggestion[] {
    const suggestions: AutocompleteSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    // Get suggestions based on user patterns
    Array.from(this.userPatterns.entries())
      .filter(([pattern]) => pattern.toLowerCase().includes(lowerQuery))
      .sort(([, freqA], [, freqB]) => freqB - freqA)
      .slice(0, 3)
      .forEach(([pattern, frequency], index) => {
        suggestions.push({
          id: `pattern_${index}`,
          value: pattern,
          label: pattern,
          confidence: Math.min(0.9, 0.6 + (frequency / 10)),
          category: 'frequently_used',
          metadata: { frequency, source: 'user_pattern' },
          icon: 'history'
        });
      });

    // Recent selections
    this.recentSelections
      .filter(selection => selection.toLowerCase().includes(lowerQuery))
      .slice(0, 2)
      .forEach((selection, index) => {
        suggestions.push({
          id: `recent_${index}`,
          value: selection,
          label: selection,
          confidence: 0.7 - (index * 0.1),
          category: 'recent',
          metadata: { source: 'recent' },
          icon: 'schedule'
        });
      });

    return suggestions;
  }

  private mergeSuggestions(
    intelligent: AutocompleteSuggestion[],
    custom: AutocompleteSuggestion[],
    predictive: any[]
  ): AutocompleteSuggestion[] {
    const allSuggestions: AutocompleteSuggestion[] = [...intelligent, ...custom];

    // Add predictive actions as suggestions
    predictive.forEach((action, index) => {
      allSuggestions.push({
        id: `predictive_${index}`,
        value: action.suggestion,
        label: action.suggestion,
        confidence: action.confidence,
        category: 'predictive',
        metadata: action.context,
        icon: 'lightbulb_outline'
      });
    });

    // Remove duplicates and sort
    const uniqueSuggestions = allSuggestions.filter((suggestion, index, arr) =>
      arr.findIndex(s => s.value.toLowerCase() === suggestion.value.toLowerCase()) === index
    );

    return uniqueSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxSuggestions);
  }

  private setupKeyboardNavigation(): void {
    this.inputElement.nativeElement.addEventListener('keydown', (event) => {
      if (!this.isOpen) return;

      const suggestions = this.suggestions$.value;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.highlightedIndex = Math.min(
            this.highlightedIndex + 1,
            suggestions.length - 1
          );
          this.scrollToHighlighted();
          break;

        case 'ArrowUp':
          event.preventDefault();
          this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
          this.scrollToHighlighted();
          break;

        case 'Enter':
          event.preventDefault();
          if (this.highlightedIndex >= 0 && this.highlightedIndex < suggestions.length) {
            this.selectSuggestion(suggestions[this.highlightedIndex]);
          } else if (this.config.allowCustom && this.value.trim()) {
            this.selectCustomValue(this.value);
          }
          break;

        case 'Escape':
          this.closeSuggestions();
          break;

        case 'Tab':
          if (this.highlightedIndex >= 0 && this.highlightedIndex < suggestions.length) {
            event.preventDefault();
            this.selectSuggestion(suggestions[this.highlightedIndex]);
          }
          break;
      }
    });
  }

  private scrollToHighlighted(): void {
    if (!this.dropdownElement || this.highlightedIndex < 0) return;

    setTimeout(() => {
      const highlighted = this.dropdownElement.nativeElement
        .querySelector(`[data-index="${this.highlightedIndex}"]`) as HTMLElement;
      
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  // Public methods
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newValue = target.value;
    
    this.value = newValue;
    this.inputValue$.next(newValue);
    this.inputChange.emit(newValue);
    this.onChange(newValue);
    
    this.highlightedIndex = -1;

    // Record learning data
    if (this.config.enableLearning) {
      this.interactionService.recordInteraction('input_change', this.config.context, true);
    }
  }

  onInputFocus(): void {
    this.onTouched();
    if (this.value.length >= this.config.minLength) {
      this.isOpen = true;
    }
  }

  onInputBlur(): void {
    // Delay closing to allow for click events
    setTimeout(() => {
      this.closeSuggestions();
    }, 150);
  }

  selectSuggestion(suggestion: AutocompleteSuggestion): void {
    this.value = suggestion.value;
    this.onChange(suggestion.value);
    this.suggestionSelected.emit(suggestion);
    this.closeSuggestions();

    // Learn from selection
    this.learnFromSelection(suggestion);

    // Update recent selections
    this.recentSelections.unshift(suggestion.value);
    this.recentSelections = this.recentSelections.slice(0, 5);

    // Record interaction
    this.interactionService.recordInteraction(
      'suggestion_selected',
      this.config.context,
      true
    );
  }

  selectCustomValue(value: string): void {
    this.value = value;
    this.onChange(value);
    this.customValueEntered.emit(value);
    this.closeSuggestions();

    // Learn from custom value
    this.learnFromCustomValue(value);

    // Record interaction
    this.interactionService.recordInteraction(
      'custom_value_entered',
      this.config.context,
      true
    );
  }

  private closeSuggestions(): void {
    this.isOpen = false;
    this.highlightedIndex = -1;
  }

  private learnFromSelection(suggestion: AutocompleteSuggestion): void {
    if (!this.config.enableLearning) return;

    const currentCount = this.userPatterns.get(suggestion.value) || 0;
    this.userPatterns.set(suggestion.value, currentCount + 1);
    this.saveUserPatterns();
  }

  private learnFromCustomValue(value: string): void {
    if (!this.config.enableLearning) return;

    const currentCount = this.userPatterns.get(value) || 0;
    this.userPatterns.set(value, currentCount + 1);
    this.saveUserPatterns();
  }

  private loadUserPatterns(): void {
    try {
      const stored = localStorage.getItem(`autocomplete_patterns_${this.config.context}`);
      if (stored) {
        const patterns = JSON.parse(stored);
        this.userPatterns = new Map(Object.entries(patterns));
      }
    } catch (error) {
      console.warn('Failed to load user patterns:', error);
    }
  }

  private saveUserPatterns(): void {
    try {
      const patterns = Object.fromEntries(this.userPatterns);
      localStorage.setItem(
        `autocomplete_patterns_${this.config.context}`,
        JSON.stringify(patterns)
      );
    } catch (error) {
      console.warn('Failed to save user patterns:', error);
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: string): void {
    this.value = value || '';
    this.inputValue$.next(this.value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // Getters
  get suggestions(): Observable<AutocompleteSuggestion[]> {
    return this.suggestions$.asObservable();
  }

  get groupedSuggestions(): Observable<{ [category: string]: AutocompleteSuggestion[] }> {
    return this.suggestions$.pipe(
      map(suggestions => {
        if (!this.config.groupByCategory) {
          return { all: suggestions };
        }

        return suggestions.reduce((groups, suggestion) => {
          const category = suggestion.category || 'other';
          if (!groups[category]) {
            groups[category] = [];
          }
          groups[category].push(suggestion);
          return groups;
        }, {} as { [category: string]: AutocompleteSuggestion[] });
      })
    );
  }

  trackBySuggestion(index: number, suggestion: AutocompleteSuggestion): string {
    return suggestion.id;
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'job_title': 'work',
      'skills': 'code',
      'company': 'business',
      'location': 'place',
      'frequently_used': 'history',
      'recent': 'schedule',
      'predictive': 'lightbulb_outline',
      'smart': 'psychology',
      'contextual': 'category'
    };
    return icons[category] || 'label';
  }

  formatConfidence(confidence: number): string {
    return `${(confidence * 100).toFixed(0)}%`;
  }
}