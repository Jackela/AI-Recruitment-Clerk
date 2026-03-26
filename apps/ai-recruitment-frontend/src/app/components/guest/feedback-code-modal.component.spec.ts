import type { ComponentFixture } from '@angular/core/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { FeedbackCodeModalComponent } from './feedback-code-modal.component';
import type { GuestState } from '../../store/guest/guest.state';
import { initialGuestState } from '../../store/guest/guest.state';
import * as GuestActions from '../../store/guest/guest.actions';
import { ToastService } from '../../services/toast.service';

describe('FeedbackCodeModalComponent', () => {
  let component: FeedbackCodeModalComponent;
  let fixture: ComponentFixture<FeedbackCodeModalComponent>;
  let store: jest.Mocked<Store<{ guest: GuestState }>>;
  let toastService: jest.Mocked<ToastService>;
  let mockState: BehaviorSubject<GuestState>;

  beforeEach(async () => {
    mockState = new BehaviorSubject<GuestState>({
      ...initialGuestState,
      showFeedbackModal: true,
      feedbackCode: 'TEST123',
      surveyUrl: 'https://survey.example.com',
      isLoading: false,
      error: null,
    });

    const storeMock = {
      select: jest.fn(),
      dispatch: jest.fn(),
    };

    const toastMock = {
      error: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [FeedbackCodeModalComponent],
      providers: [
        {
          provide: Store,
          useValue: storeMock,
        },
        {
          provide: ToastService,
          useValue: toastMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FeedbackCodeModalComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(Store) as jest.Mocked<Store<{ guest: GuestState }>>;
    toastService = TestBed.inject(ToastService) as jest.Mocked<ToastService>;

    store.select.mockImplementation((selector: unknown) => {
      if (typeof selector === 'function') {
        return mockState.pipe(
          map((state) =>
            (selector as (state: { guest: GuestState }) => unknown)({
              guest: state,
            }),
          ),
        );
      }
      return mockState.asObservable();
    });

    component.showModal$ = mockState.pipe(
      map((state) => state.showFeedbackModal),
    );
    component.guestState$ = mockState.asObservable();
    component.isLoading$ = mockState.pipe(map((state) => state.isLoading));
    component.error$ = mockState.pipe(map((state) => state.error));
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockState.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display modal when showFeedbackModal is true', () => {
    fixture.detectChanges();

    const modalElement = fixture.nativeElement.querySelector('.fixed.inset-0');
    expect(modalElement).toBeTruthy();
  });

  it('should not display modal when showFeedbackModal is false', () => {
    mockState.next({
      ...mockState.value,
      showFeedbackModal: false,
    });
    fixture.detectChanges();

    const modalElement = fixture.nativeElement.querySelector('.fixed.inset-0');
    expect(modalElement).toBeFalsy();
  });

  it('should display feedback code', () => {
    fixture.detectChanges();

    const feedbackCodeInput =
      fixture.nativeElement.querySelector('#feedbackCodeInput');
    expect(feedbackCodeInput).toBeTruthy();
    expect(feedbackCodeInput.value).toBe('TEST123');
  });

  it('should display survey URL', () => {
    fixture.detectChanges();

    const surveyLink =
      fixture.nativeElement.querySelector('a[target="_blank"]');
    expect(surveyLink).toBeTruthy();
    expect(surveyLink.href).toContain('survey.example.com');
  });

  it('should display reward information', () => {
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('¥3 现金奖励');
    expect(content).toContain('+5 使用次数');
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should close modal when close button is clicked', () => {
      const closeButton = fixture.nativeElement.querySelector(
        'button[class*="absolute"]',
      );
      closeButton.click();

      expect(store.dispatch).toHaveBeenCalledWith(
        GuestActions.hideFeedbackModal(),
      );
    });

    it('should close modal when backdrop is clicked', () => {
      const backdrop = fixture.nativeElement.querySelector('.fixed.inset-0');
      backdrop.click();

      expect(store.dispatch).toHaveBeenCalledWith(
        GuestActions.hideFeedbackModal(),
      );
    });

    it('should not close modal when modal content is clicked', () => {
      const modalContent = fixture.nativeElement.querySelector(
        '.bg-white.rounded-lg',
      );
      modalContent.click();

      expect(store.dispatch).not.toHaveBeenCalledWith(
        GuestActions.hideFeedbackModal(),
      );
    });

    it('should dispatch redeem action when redeem button is clicked', () => {
      component.redemptionCode = 'TEST123';
      fixture.detectChanges();

      const redeemButton = fixture.nativeElement.querySelector(
        'button[class*="bg-green-600"]',
      );
      redeemButton.click();

      expect(store.dispatch).toHaveBeenCalledWith(
        GuestActions.redeemFeedbackCode({ feedbackCode: 'TEST123' }),
      );
    });

    it('should disable redeem button when no redemption code', () => {
      component.redemptionCode = '';
      fixture.detectChanges();

      const redeemButton = fixture.nativeElement.querySelector(
        'button[class*="bg-green-600"]',
      );
      expect(redeemButton.disabled).toBe(true);
    });

    it('should dispatch updateLastActivity when survey link is clicked', () => {
      const surveyLink =
        fixture.nativeElement.querySelector('a[target="_blank"]');
      surveyLink.click();

      expect(store.dispatch).toHaveBeenCalledWith(
        GuestActions.updateLastActivity(),
      );
    });

    it('should close modal when "稍后处理" button is clicked', () => {
      const laterButton = fixture.nativeElement.querySelector(
        'button[class*="text-gray-500"]',
      );
      laterButton.click();

      expect(store.dispatch).toHaveBeenCalledWith(
        GuestActions.hideFeedbackModal(),
      );
    });
  });

  describe('Copy Functionality', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should copy feedback code to clipboard', () => {
      const mockInput = {
        select: jest.fn(),
        setSelectionRange: jest.fn(),
      } as unknown as HTMLInputElement;

      const execCommandMock = jest
        .spyOn(document, 'execCommand')
        .mockReturnValue(true);

      component.copyFeedbackCode(mockInput);

      expect(mockInput.select).toHaveBeenCalled();
      expect(mockInput.setSelectionRange).toHaveBeenCalledWith(0, 99999);
      expect(execCommandMock).toHaveBeenCalledWith('copy');
      expect(component.copied).toBe(true);

      execCommandMock.mockRestore();
    });

    it('should show error toast when copy fails', () => {
      const mockInput = {
        select: jest.fn(),
        setSelectionRange: jest.fn(),
      } as unknown as HTMLInputElement;

      const execCommandMock = jest
        .spyOn(document, 'execCommand')
        .mockReturnValue(false);

      component.copyFeedbackCode(mockInput);

      expect(toastService.error).toHaveBeenCalledWith(
        '复制失败，请手动选择复制',
      );

      execCommandMock.mockRestore();
    });

    it('should reset copied state after 2 seconds', fakeAsync(() => {
      const mockInput = {
        select: jest.fn(),
        setSelectionRange: jest.fn(),
      } as unknown as HTMLInputElement;

      jest.spyOn(document, 'execCommand').mockReturnValue(true);

      component.copyFeedbackCode(mockInput);
      expect(component.copied).toBe(true);

      tick(2100);

      expect(component.copied).toBe(false);
    }));

    it('should show correct copied button class when copied', () => {
      component.copied = true;
      expect(component.copiedClass).toContain('bg-green-100');
      expect(component.copiedClass).toContain('text-green-700');
    });

    it('should show default button class when not copied', () => {
      component.copied = false;
      expect(component.copiedClass).toContain('bg-gray-100');
      expect(component.copiedClass).toContain('text-gray-700');
    });
  });

  describe('Loading States', () => {
    it('should disable redeem button when loading', () => {
      mockState.next({
        ...mockState.value,
        isLoading: true,
      });
      component.redemptionCode = 'TEST123';
      fixture.detectChanges();

      const redeemButton = fixture.nativeElement.querySelector(
        'button[class*="bg-green-600"]',
      );
      expect(redeemButton.disabled).toBe(true);
    });
  });

  describe('Error Display', () => {
    it('should display error message when error exists', () => {
      mockState.next({
        ...mockState.value,
        error: 'Test error message',
      });
      fixture.detectChanges();

      const errorElement = fixture.nativeElement.querySelector('.bg-red-50');
      expect(errorElement).toBeTruthy();
      expect(errorElement.textContent).toContain('Test error message');
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

  describe('Redemption Code Input', () => {
    it('should pre-populate redemption code from guest state', () => {
      component.ngOnInit();
      mockState.next({
        ...mockState.value,
        feedbackCode: 'AUTO123',
      });

      expect(component.redemptionCode).toBe('AUTO123');
    });

    it('should not override existing redemption code', () => {
      component.redemptionCode = 'MANUAL456';
      component.ngOnInit();
      mockState.next({
        ...mockState.value,
        feedbackCode: 'AUTO123',
      });

      expect(component.redemptionCode).toBe('MANUAL456');
    });
  });

  describe('Component Lifecycle', () => {
    it('should complete destroy subject on component destroy', () => {
      const destroySpy = jest.spyOn(component['destroy
}], 'next');
      const completeSpy = jest.spyOn(component['destroy
}], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should have proper ARIA attributes on modal', () => {
      const modal = fixture.nativeElement.querySelector('.fixed.inset-0');
      expect(modal.getAttribute('role')).toBe('dialog');
      expect(modal.getAttribute('aria-modal')).toBe('true');
    });

    it('should be keyboard accessible', () => {
      const copyButton = fixture.nativeElement.querySelector(
        'button[class*="bg-gray-100"], button[class*="bg-green-100"]',
      );
      const redeemButton = fixture.nativeElement.querySelector(
        'button[class*="bg-green-600"]',
      );

      if (copyButton) {
        expect(copyButton.tabIndex).not.toBe(-1);
      }
      if (redeemButton) {
        expect(redeemButton.tabIndex).not.toBe(-1);
      }
    });

    it('should have labeled input for feedback code', () => {
      const input = fixture.nativeElement.querySelector('#feedbackCodeInput');
      const label = fixture.nativeElement.querySelector(
        'label[for="feedbackCodeInput"]',
      );

      expect(input).toBeTruthy();
      expect(label).toBeTruthy();
    });
  });

  describe('copiedClass getter', () => {
    it('should return success class when copied is true', () => {
      component.copied = true;
      const className = component.copiedClass;
      expect(className).toContain('bg-green-100');
      expect(className).toContain('text-green-700');
      expect(className).toContain('border-green-200');
    });

    it('should return default class when copied is false', () => {
      component.copied = false;
      const className = component.copiedClass;
      expect(className).toContain('bg-gray-100');
      expect(className).toContain('text-gray-700');
      expect(className).toContain('border-gray-200');
    });
  });
});
