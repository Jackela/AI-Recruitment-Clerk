import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { trigger, state, style, transition, animate, keyframes, query, stagger } from '@angular/animations';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export type MicrointeractionType = 
  | 'button-ripple' 
  | 'form-validation' 
  | 'loading-spinner' 
  | 'success-checkmark' 
  | 'error-shake' 
  | 'hover-lift' 
  | 'focus-glow' 
  | 'slide-in' 
  | 'fade-in' 
  | 'scale-in'
  | 'skeleton-loading'
  | 'progress-bar'
  | 'notification-toast';

export interface MicrointeractionConfig {
  type: MicrointeractionType;
  duration?: number;
  delay?: number;
  easing?: string;
  trigger?: 'click' | 'hover' | 'focus' | 'auto';
  respectMotionPreference?: boolean;
}

@Component({
  selector: 'app-microinteraction',
  templateUrl: './microinteraction.component.html',
  styleUrls: ['./microinteraction.component.scss'],
  animations: [
    // Button Ripple Effect
    trigger('ripple', [
      state('inactive', style({ transform: 'scale(0)', opacity: 0.6 })),
      state('active', style({ transform: 'scale(2)', opacity: 0 })),
      transition('inactive => active', animate('600ms ease-out'))
    ]),

    // Loading Spinner
    trigger('spin', [
      transition(':enter', [
        animate('1s linear', keyframes([
          style({ transform: 'rotate(0deg)', offset: 0 }),
          style({ transform: 'rotate(360deg)', offset: 1 })
        ]))
      ])
    ]),

    // Success Checkmark
    trigger('checkmark', [
      transition(':enter', [
        style({ strokeDasharray: '60', strokeDashoffset: '60' }),
        animate('800ms ease-in-out', style({ strokeDashoffset: '0' }))
      ])
    ]),

    // Error Shake
    trigger('shake', [
      transition('* => error', [
        animate('500ms ease-in-out', keyframes([
          style({ transform: 'translateX(0)', offset: 0 }),
          style({ transform: 'translateX(-10px)', offset: 0.1 }),
          style({ transform: 'translateX(10px)', offset: 0.2 }),
          style({ transform: 'translateX(-10px)', offset: 0.3 }),
          style({ transform: 'translateX(10px)', offset: 0.4 }),
          style({ transform: 'translateX(-10px)', offset: 0.5 }),
          style({ transform: 'translateX(10px)', offset: 0.6 }),
          style({ transform: 'translateX(-10px)', offset: 0.7 }),
          style({ transform: 'translateX(10px)', offset: 0.8 }),
          style({ transform: 'translateX(0)', offset: 1 })
        ]))
      ])
    ]),

    // Hover Lift
    trigger('lift', [
      state('default', style({ transform: 'translateY(0) scale(1)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' })),
      state('lifted', style({ transform: 'translateY(-4px) scale(1.02)', boxShadow: '0 8px 25px rgba(0,0,0,0.15)' })),
      transition('default <=> lifted', animate('200ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ]),

    // Focus Glow
    trigger('glow', [
      state('default', style({ boxShadow: 'none' })),
      state('focused', style({ boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.4)' })),
      transition('default <=> focused', animate('150ms ease-in-out'))
    ]),

    // Slide In
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(0)', opacity: 1 }))
      ])
    ]),

    // Fade In
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in-out', style({ opacity: 1 }))
      ])
    ]),

    // Scale In
    trigger('scaleIn', [
      transition(':enter', [
        style({ transform: 'scale(0.8)', opacity: 0 }),
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'scale(1)', opacity: 1 }))
      ])
    ]),

    // Skeleton Loading
    trigger('pulse', [
      transition('* => *', [
        animate('1.5s ease-in-out', keyframes([
          style({ opacity: 1, offset: 0 }),
          style({ opacity: 0.5, offset: 0.5 }),
          style({ opacity: 1, offset: 1 })
        ]))
      ])
    ]),

    // Stagger Animation for Lists
    trigger('stagger', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', 
              style({ opacity: 1, transform: 'translateY(0)' })
            )
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class MicrointeractionComponent implements OnInit, OnDestroy {
  @Input() config: MicrointeractionConfig = { type: 'fade-in' };
  @Input() disabled = false;
  @Input() loading = false;
  @Input() error = false;
  @Input() success = false;

  @Output() interactionComplete = new EventEmitter<void>();
  @Output() interactionStart = new EventEmitter<void>();

  @ViewChild('element', { static: false }) elementRef!: ElementRef;

  private destroy$ = new Subject<void>();
  private prefersReducedMotion = false;

  // Animation states
  rippleState = 'inactive';
  liftState = 'default';
  glowState = 'default';
  shakeState = 'normal';

  // Ripple effect properties
  ripples: Array<{ x: number; y: number; id: number }> = [];
  private rippleId = 0;

  ngOnInit(): void {
    this.checkMotionPreference();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkMotionPreference(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = motionQuery.matches;
      
      motionQuery.addEventListener('change', (e) => {
        this.prefersReducedMotion = e.matches;
      });
    }
  }

  private setupEventListeners(): void {
    if (!this.elementRef?.nativeElement) return;

    const element = this.elementRef.nativeElement;

    // Click events
    if (this.config.trigger === 'click' || this.config.type === 'button-ripple') {
      element.addEventListener('click', this.handleClick.bind(this));
    }

    // Hover events
    if (this.config.trigger === 'hover' || this.config.type === 'hover-lift') {
      element.addEventListener('mouseenter', this.handleHover.bind(this));
      element.addEventListener('mouseleave', this.handleHoverEnd.bind(this));
    }

    // Focus events
    if (this.config.trigger === 'focus' || this.config.type === 'focus-glow') {
      element.addEventListener('focus', this.handleFocus.bind(this));
      element.addEventListener('blur', this.handleBlur.bind(this));
    }
  }

  private handleClick(event: MouseEvent): void {
    if (this.disabled || this.shouldSkipAnimation()) return;

    this.interactionStart.emit();

    switch (this.config.type) {
      case 'button-ripple':
        this.createRipple(event);
        break;
      case 'error-shake':
        if (this.error) {
          this.shakeState = 'error';
        }
        break;
    }

    this.scheduleCompletion();
  }

  private handleHover(): void {
    if (this.disabled || this.shouldSkipAnimation()) return;

    if (this.config.type === 'hover-lift') {
      this.liftState = 'lifted';
    }
  }

  private handleHoverEnd(): void {
    if (this.config.type === 'hover-lift') {
      this.liftState = 'default';
    }
  }

  private handleFocus(): void {
    if (this.disabled || this.shouldSkipAnimation()) return;

    if (this.config.type === 'focus-glow') {
      this.glowState = 'focused';
    }
  }

  private handleBlur(): void {
    if (this.config.type === 'focus-glow') {
      this.glowState = 'default';
    }
  }

  private createRipple(event: MouseEvent): void {
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const ripple = {
      x,
      y,
      id: this.rippleId++
    };

    this.ripples.push(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      this.ripples = this.ripples.filter(r => r.id !== ripple.id);
    }, 600);
  }

  private shouldSkipAnimation(): boolean {
    return this.prefersReducedMotion && (this.config.respectMotionPreference ?? true);
  }

  private scheduleCompletion(): void {
    const duration = this.config.duration ?? 300;
    const delay = this.config.delay ?? 0;

    setTimeout(() => {
      this.interactionComplete.emit();
    }, duration + delay);
  }

  // Public methods for programmatic control
  triggerAnimation(): void {
    if (this.shouldSkipAnimation()) return;

    this.interactionStart.emit();

    switch (this.config.type) {
      case 'success-checkmark':
        // Trigger checkmark animation
        break;
      case 'error-shake':
        this.shakeState = 'error';
        break;
      case 'loading-spinner':
        // Handled by template
        break;
    }

    this.scheduleCompletion();
  }

  reset(): void {
    this.ripples = [];
    this.rippleState = 'inactive';
    this.liftState = 'default';
    this.glowState = 'default';
    this.shakeState = 'normal';
  }

  // Accessibility helpers
  announceToScreenReader(message: string): void {
    if (typeof window !== 'undefined') {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }
  }
}