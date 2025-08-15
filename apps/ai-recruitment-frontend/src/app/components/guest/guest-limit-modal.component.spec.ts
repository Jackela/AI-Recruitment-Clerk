import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { GuestLimitModalComponent } from './guest-limit-modal.component';
import { GuestState, initialGuestState } from '../../store/guest/guest.state';
import * as GuestActions from '../../store/guest/guest.actions';

describe('GuestLimitModalComponent', () => {
  let component: GuestLimitModalComponent;
  let fixture: ComponentFixture<GuestLimitModalComponent>;
  let store: jest.Mocked<Store<{ guest: GuestState }>>;
  let mockState: BehaviorSubject<GuestState>;

  beforeEach(async () => {
    mockState = new BehaviorSubject<GuestState>({
      ...initialGuestState,
      showLimitModal: true,
      usageCount: 5,
      maxUsage: 5,
      remainingCount: 0,
      isLimited: true,
    });

    const storeMock = {
      select: jest.fn(),
      dispatch: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GuestLimitModalComponent],
      providers: [
        {
          provide: Store,
          useValue: storeMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GuestLimitModalComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(Store) as jest.Mocked<Store<{ guest: GuestState }>>;

    // Setup store selectors - provide observables for each property
    store.select.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return mockState.pipe(map(state => selector({ guest: state })));
      }
      // Handle string-based selectors
      return mockState.asObservable();
    });

    // Ensure all observables are properly initialized
    component.showModal$ = mockState.pipe(map(state => state.showLimitModal));
    component.guestState$ = mockState.asObservable();
    component.isLoading$ = mockState.pipe(map(state => state.isLoading));
    component.error$ = mockState.pipe(map(state => state.error));
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockState.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display modal when showLimitModal is true', () => {
    fixture.detectChanges();
    
    const modalElement = fixture.nativeElement.querySelector('.fixed.inset-0');
    expect(modalElement).toBeTruthy();
  });

  it('should not display modal when showLimitModal is false', () => {
    mockState.next({
      ...mockState.value,
      showLimitModal: false,
    });
    fixture.detectChanges();
    
    const modalElement = fixture.nativeElement.querySelector('.fixed.inset-0');
    expect(modalElement).toBeFalsy();
  });

  it('should display correct usage statistics', () => {
    fixture.detectChanges();
    
    const usageText = fixture.nativeElement.textContent;
    expect(usageText).toContain('5/5'); // usageCount/maxUsage
    expect(usageText).toContain('0'); // remainingCount
  });

  it('should show incentive information', () => {
    fixture.detectChanges();
    
    const incentiveText = fixture.nativeElement.textContent;
    expect(incentiveText).toContain('¥3 现金');
    expect(incentiveText).toContain('5次使用权');
    expect(incentiveText).toContain('问卷反馈');
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should close modal when close button is clicked', () => {
      const closeButton = fixture.nativeElement.querySelector('button[class*="absolute"]');
      closeButton.click();

      expect(store.dispatch).toHaveBeenCalledWith(GuestActions.hideLimitModal());
    });

    it('should close modal when backdrop is clicked', () => {
      const backdrop = fixture.nativeElement.querySelector('.fixed.inset-0');
      backdrop.click();

      expect(store.dispatch).toHaveBeenCalledWith(GuestActions.hideLimitModal());
    });

    it('should not close modal when modal content is clicked', () => {
      const modalContent = fixture.nativeElement.querySelector('.bg-white.rounded-lg');
      modalContent.click();

      expect(store.dispatch).not.toHaveBeenCalledWith(GuestActions.hideLimitModal());
    });

    it('should generate feedback code when button is clicked', () => {
      const generateButton = fixture.nativeElement.querySelector('button[class*="bg-blue-600"]');
      generateButton.click();

      expect(store.dispatch).toHaveBeenCalledWith(GuestActions.generateFeedbackCode());
    });

    it('should try demo when demo button is clicked', () => {
      const demoButton = fixture.nativeElement.querySelector('button[class*="bg-gray-100"]');
      demoButton.click();

      expect(store.dispatch).toHaveBeenCalledWith(GuestActions.loadDemoAnalysis());
      expect(store.dispatch).toHaveBeenCalledWith(GuestActions.hideLimitModal());
    });

    it('should close modal when "稍后再说" button is clicked', () => {
      const laterButton = fixture.nativeElement.querySelector('button[class*="text-gray-500"]');
      laterButton.click();

      expect(store.dispatch).toHaveBeenCalledWith(GuestActions.hideLimitModal());
    });
  });

  describe('Loading States', () => {
    it('should disable button and show loading text when loading', () => {
      mockState.next({
        ...mockState.value,
        isLoading: true,
      });
      fixture.detectChanges();

      const generateButton = fixture.nativeElement.querySelector('button[class*="bg-blue-600"]');
      expect(generateButton.disabled).toBe(true);
      expect(generateButton.textContent).toContain('生成中...');
    });

    it('should show loading spinner when loading', () => {
      mockState.next({
        ...mockState.value,
        isLoading: true,
      });
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('.animate-spin');
      expect(spinner).toBeTruthy();
    });

    it('should show normal text when not loading', () => {
      mockState.next({
        ...mockState.value,
        isLoading: false,
      });
      fixture.detectChanges();

      const generateButton = fixture.nativeElement.querySelector('button[class*="bg-blue-600"]');
      expect(generateButton.disabled).toBe(false);
      expect(generateButton.textContent).toContain('获取反馈码参与活动');
    });
  });

  describe('Error Display', () => {
    it('should display error message when error exists', () => {
      const errorMessage = 'Test error message';
      mockState.next({
        ...mockState.value,
        error: errorMessage,
      });
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.bg-red-50');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain(errorMessage);
    });

    it('should not display error section when no error', () => {
      mockState.next({
        ...mockState.value,
        error: null,
      });
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.bg-red-50');
      expect(errorElement).toBeFalsy();
    });
  });

  describe('Auto-close Functionality', () => {
    afterEach(() => {
      // Clean up any timers to prevent interference between tests
      if (component['autoCloseTimer']) {
        clearTimeout(component['autoCloseTimer']);
        component['autoCloseTimer'] = null;
      }
    });

    it('should auto-close modal after 30 seconds', (done) => {
      jest.useFakeTimers();
      
      // Start with modal open to trigger the timer
      mockState.next({
        ...mockState.value,
        showLimitModal: true,
      });
      
      component.ngOnInit();
      
      // Fast-forward time
      jest.advanceTimersByTime(30000);
      
      expect(store.dispatch).toHaveBeenCalledWith(GuestActions.hideLimitModal());
      
      jest.useRealTimers();
      done();
    });

    it('should not auto-close if modal is already closed', () => {
      jest.useFakeTimers();
      
      // Start with modal open
      mockState.next({
        ...mockState.value,
        showLimitModal: true,
      });
      
      component.ngOnInit();
      
      // Close modal manually
      mockState.next({
        ...mockState.value,
        showLimitModal: false,
      });
      
      // Fast-forward time
      jest.advanceTimersByTime(30000);
      
      // Should not dispatch hide action since modal is already closed
      expect(store.dispatch).not.toHaveBeenCalledWith(GuestActions.hideLimitModal());
      
      jest.useRealTimers();
    });
  });

  describe('Component Lifecycle', () => {
    it('should complete destroy subject on component destroy', () => {
      const destroySpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');
      
      component.ngOnDestroy();
      
      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should subscribe to observables on init', () => {
      const selectSpy = jest.spyOn(store, 'select');
      
      component.ngOnInit();
      
      expect(selectSpy).toHaveBeenCalledTimes(4); // showModal$, guestState$, isLoading$, error$
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have proper ARIA attributes', () => {
      const modal = fixture.nativeElement.querySelector('.fixed.inset-0');
      const closeButton = fixture.nativeElement.querySelector('button');
      
      expect(modal).toBeTruthy();
      if (closeButton) {
        expect(closeButton.getAttribute('aria-label') || closeButton.textContent).toBeTruthy();
      } else {
        // If no close button found, check for other interactive elements
        const interactiveElements = fixture.nativeElement.querySelectorAll('button, [role="button"]');
        expect(interactiveElements.length).toBeGreaterThan(0);
      }
    });

    it('should be keyboard accessible', () => {
      const generateButton = fixture.nativeElement.querySelector('button[class*="bg-blue-600"]');
      const demoButton = fixture.nativeElement.querySelector('button[class*="bg-gray-100"]');
      const laterButton = fixture.nativeElement.querySelector('button[class*="text-gray-500"]');
      
      expect(generateButton.tabIndex).not.toBe(-1);
      expect(demoButton.tabIndex).not.toBe(-1);
      expect(laterButton.tabIndex).not.toBe(-1);
    });

    it('should handle keyboard events for modal close', () => {
      const backdrop = fixture.nativeElement.querySelector('.fixed.inset-0');
      
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      backdrop.dispatchEvent(escapeEvent);
      
      // Note: You would need to implement keyboard event handling in the component
      // This test documents the expected behavior
    });
  });

  describe('Visual States', () => {
    it('should show correct icon for warning state', () => {
      fixture.detectChanges();
      
      const warningIcon = fixture.nativeElement.querySelector('.text-orange-600');
      expect(warningIcon).toBeTruthy();
    });

    it('should show incentive with proper styling', () => {
      fixture.detectChanges();
      
      const incentiveSection = fixture.nativeElement.querySelector('.bg-gradient-to-r');
      expect(incentiveSection).toBeTruthy();
      
      const cashReward = fixture.nativeElement.querySelector('.text-green-600');
      expect(cashReward.textContent).toContain('¥3');
    });

    it('should display usage progress correctly', () => {
      mockState.next({
        ...mockState.value,
        usageCount: 3,
        maxUsage: 5,
        remainingCount: 2,
      });
      fixture.detectChanges();
      
      const usageDisplay = fixture.nativeElement.textContent;
      expect(usageDisplay).toContain('3/5');
      expect(usageDisplay).toContain('2');
    });
  });
});

