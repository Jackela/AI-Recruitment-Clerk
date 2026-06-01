import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import {
  ConsentManagementComponent,
  ConsentPurpose,
  ConsentMethod,
  DataCategory,
} from './consent-management.component';
import { PrivacyApiService } from '../../services/privacy-api.service';
import { ToastService } from '../../services/toast.service';

describe('ConsentManagementComponent', () => {
  let component: ConsentManagementComponent;
  let fixture: ComponentFixture<ConsentManagementComponent>;
  let privacyApiService: jest.Mocked<PrivacyApiService>;
  let toastService: jest.Mocked<ToastService>;

  const mockConsentStatus = {
    userId: 'user-123',
    needsRenewal: false,
    lastUpdated: new Date(),
    purposes: [
      {
        purpose: ConsentPurpose.ESSENTIAL_SERVICES,
        status: 'granted' as const,
        grantedAt: new Date(),
      },
      {
        purpose: ConsentPurpose.FUNCTIONAL_ANALYTICS,
        status: 'granted' as const,
        grantedAt: new Date(),
      },
      {
        purpose: ConsentPurpose.BEHAVIORAL_ANALYTICS,
        status: 'denied' as const,
      },
    ],
  };

  const mockPrivacyApiService = {
    getConsentStatus: jest.fn().mockResolvedValue(mockConsentStatus),
    captureConsent: jest.fn().mockResolvedValue({}),
    withdrawConsent: jest.fn().mockResolvedValue(undefined),
  };

  const mockToastService = {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsentManagementComponent, ReactiveFormsModule],
      providers: [
        FormBuilder,
        {
          provide: PrivacyApiService,
          useValue: mockPrivacyApiService,
        },
        {
          provide: ToastService,
          useValue: mockToastService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConsentManagementComponent);
    component = fixture.componentInstance;
    privacyApiService = TestBed.inject(
      PrivacyApiService,
    ) as jest.Mocked<PrivacyApiService>;
    toastService = TestBed.inject(ToastService) as jest.Mocked<ToastService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize form with processing purposes', () => {
      fixture.detectChanges();

      expect(component.consentForm).toBeTruthy();
      expect(component.consentsArray.length).toBe(
        component.processingPurposes.length,
      );
    });

    it('should set required consents to true by default', () => {
      fixture.detectChanges();

      const essentialConsent = component.consentsArray.at(0) as ReturnType<
        FormBuilder['group']
      >;
      expect(essentialConsent.get('granted')?.value).toBe(true);
    });

    it('should set optional consents to false by default', () => {
      fixture.detectChanges();

      const functionalConsent = component.consentsArray.at(1) as ReturnType<
        FormBuilder['group']
      >;
      expect(functionalConsent.get('granted')?.value).toBe(false);
    });

    it('should load current consent in update mode', async () => {
      component.userId = 'user-123';
      component.mode = 'update';
      fixture.detectChanges();

      await fixture.whenStable();

      expect(privacyApiService.getConsentStatus).toHaveBeenCalledWith(
        'user-123',
      );
      expect(component.currentConsentStatus).toEqual(mockConsentStatus);
    });

    it('should not load consent in initial mode', async () => {
      component.userId = 'user-123';
      component.mode = 'initial';
      fixture.detectChanges();

      await fixture.whenStable();

      expect(privacyApiService.getConsentStatus).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should require privacy policy acceptance', () => {
      const privacyControl = component.consentForm.get('privacyPolicyAccepted');
      expect(privacyControl?.hasError('required')).toBe(true);

      privacyControl?.setValue(true);
      expect(privacyControl?.valid).toBe(true);
    });

    it('should require age confirmation', () => {
      const ageControl = component.consentForm.get('ageConfirmation');
      expect(ageControl?.hasError('required')).toBe(true);

      ageControl?.setValue(true);
      expect(ageControl?.valid).toBe(true);
    });

    it('should mark form invalid when privacy policy not accepted', () => {
      component.consentForm.patchValue({
        privacyPolicyAccepted: false,
        ageConfirmation: true,
      });

      expect(component.consentForm.invalid).toBe(true);
    });

    it('should mark form valid when all required fields are set', () => {
      component.consentForm.patchValue({
        privacyPolicyAccepted: true,
        ageConfirmation: true,
      });

      expect(component.consentForm.valid).toBe(true);
    });
  });

  describe('Purpose Methods', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should identify required purposes correctly', () => {
      const essentialIndex = component.processingPurposes.findIndex(
        (p) => p.purpose === ConsentPurpose.ESSENTIAL_SERVICES,
      );
      const functionalIndex = component.processingPurposes.findIndex(
        (p) => p.purpose === ConsentPurpose.FUNCTIONAL_ANALYTICS,
      );

      expect(component.isPurposeRequired(essentialIndex)).toBe(true);
      expect(component.isPurposeRequired(functionalIndex)).toBe(false);
    });

    it('should identify withdrawable purposes correctly', () => {
      const essentialIndex = component.processingPurposes.findIndex(
        (p) => p.purpose === ConsentPurpose.ESSENTIAL_SERVICES,
      );
      const functionalIndex = component.processingPurposes.findIndex(
        (p) => p.purpose === ConsentPurpose.FUNCTIONAL_ANALYTICS,
      );

      expect(component.canWithdrawPurpose(essentialIndex)).toBe(false);
      expect(component.canWithdrawPurpose(functionalIndex)).toBe(true);
    });

    it('should get purpose info by index', () => {
      const purposeInfo = component.getPurposeInfo(0);
      expect(purposeInfo).toBeTruthy();
      expect(purposeInfo.purpose).toBe(ConsentPurpose.ESSENTIAL_SERVICES);
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      component.userId = 'user-123';
      fixture.detectChanges();

      // Set valid form state
      component.consentForm.patchValue({
        privacyPolicyAccepted: true,
        ageConfirmation: true,
      });
    });

    it('should not submit when form is invalid', async () => {
      component.consentForm.patchValue({
        privacyPolicyAccepted: false,
      });

      await component.onSubmit();

      expect(privacyApiService.captureConsent).not.toHaveBeenCalled();
    });

    it('should not submit when userId is missing', async () => {
      component.userId = undefined;

      await component.onSubmit();

      expect(privacyApiService.captureConsent).not.toHaveBeenCalled();
    });

    it('should capture consent on valid submission', async () => {
      privacyApiService.captureConsent.mockResolvedValueOnce({
        userId: 'user-123',
        consents: [],
      });

      await component.onSubmit();

      expect(privacyApiService.captureConsent).toHaveBeenCalled();
      expect(toastService.success).toHaveBeenCalledWith(
        'Consent preferences saved successfully',
      );
    });

    it('should emit consentCaptured in initial mode', async () => {
      component.mode = 'initial';
      const emitSpy = jest.spyOn(component.consentCaptured, 'emit');

      privacyApiService.getConsentStatus.mockResolvedValueOnce(
        mockConsentStatus,
      );

      await component.onSubmit();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit consentUpdated in update mode', async () => {
      component.mode = 'update';
      const emitSpy = jest.spyOn(component.consentUpdated, 'emit');

      privacyApiService.getConsentStatus.mockResolvedValueOnce(
        mockConsentStatus,
      );

      await component.onSubmit();

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should show error toast on submission failure', async () => {
      privacyApiService.captureConsent.mockRejectedValueOnce(
        new Error('API Error'),
      );

      await component.onSubmit();

      expect(toastService.error).toHaveBeenCalledWith(
        'Failed to save consent preferences',
      );
    });
  });

  describe('Withdraw Consent', () => {
    beforeEach(() => {
      component.userId = 'user-123';
      fixture.detectChanges();
    });

    it('should not withdraw when userId is missing', async () => {
      component.userId = undefined;

      await component.withdrawConsent(ConsentPurpose.FUNCTIONAL_ANALYTICS);

      expect(privacyApiService.withdrawConsent).not.toHaveBeenCalled();
    });

    it('should show warning when trying to withdraw required consent', async () => {
      await component.withdrawConsent(ConsentPurpose.ESSENTIAL_SERVICES);

      expect(toastService.warning).toHaveBeenCalledWith(
        'This consent cannot be withdrawn as it is required for essential services',
      );
      expect(privacyApiService.withdrawConsent).not.toHaveBeenCalled();
    });

    it('should show confirmation dialog before withdrawal', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      await component.withdrawConsent(ConsentPurpose.FUNCTIONAL_ANALYTICS);

      expect(confirmSpy).toHaveBeenCalled();
      expect(privacyApiService.withdrawConsent).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should withdraw consent after confirmation', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      await component.withdrawConsent(ConsentPurpose.FUNCTIONAL_ANALYTICS);

      expect(privacyApiService.withdrawConsent).toHaveBeenCalledWith({
        userId: 'user-123',
        purpose: ConsentPurpose.FUNCTIONAL_ANALYTICS,
        reason: 'User requested withdrawal',
      });
    });

    it('should show success toast after withdrawal', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      await component.withdrawConsent(ConsentPurpose.FUNCTIONAL_ANALYTICS);

      expect(toastService.success).toHaveBeenCalledWith(
        expect.stringContaining('has been withdrawn'),
      );
    });

    it('should reload consent status after withdrawal', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      await component.withdrawConsent(ConsentPurpose.FUNCTIONAL_ANALYTICS);

      expect(privacyApiService.getConsentStatus).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should show error toast on withdrawal failure', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      privacyApiService.withdrawConsent.mockRejectedValueOnce(
        new Error('API Error'),
      );

      await component.withdrawConsent(ConsentPurpose.FUNCTIONAL_ANALYTICS);

      expect(toastService.error).toHaveBeenCalledWith(
        'Failed to withdraw consent',
      );
    });
  });

  describe('Current Consent Status', () => {
    beforeEach(() => {
      component.currentConsentStatus = mockConsentStatus;
      fixture.detectChanges();
    });

    it('should get current consent status for a purpose', () => {
      const status = component.getCurrentConsentStatus(
        ConsentPurpose.ESSENTIAL_SERVICES,
      );
      expect(status).toBe('granted');
    });

    it('should return undefined for unknown purpose', () => {
      const status = component.getCurrentConsentStatus(
        'unknown_purpose' as ConsentPurpose,
      );
      expect(status).toBeUndefined();
    });

    it('should get consent date for a purpose', () => {
      const date = component.getConsentDate(ConsentPurpose.ESSENTIAL_SERVICES);
      expect(date).toBeInstanceOf(Date);
    });

    it('should return undefined for consent date when not granted', () => {
      const date = component.getConsentDate(
        ConsentPurpose.BEHAVIORAL_ANALYTICS,
      );
      expect(date).toBeUndefined();
    });

    it('should check if consent needs renewal', () => {
      expect(component.needsRenewal()).toBe(false);

      component.currentConsentStatus = {
        ...mockConsentStatus,
        needsRenewal: true,
      };
      expect(component.needsRenewal()).toBe(true);
    });
  });

  describe('Field Validation Helpers', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should check if field is invalid', () => {
      const fieldName = 'privacyPolicyAccepted';

      expect(component.isFieldInvalid(fieldName)).toBe(true);

      component.consentForm.get(fieldName)?.setValue(true);
      expect(component.isFieldInvalid(fieldName)).toBe(false);
    });

    it('should get field error message', () => {
      const fieldName = 'privacyPolicyAccepted';
      component.consentForm.get(fieldName)?.markAsTouched();

      const error = component.getFieldError(fieldName);
      expect(error).toBe('This field is required');
    });

    it('should return empty string for valid field', () => {
      component.consentForm.get('privacyPolicyAccepted')?.setValue(true);

      const error = component.getFieldError('privacyPolicyAccepted');
      expect(error).toBe('');
    });
  });

  describe('Processing Purposes', () => {
    it('should have essential services as first purpose', () => {
      expect(component.processingPurposes[0].purpose).toBe(
        ConsentPurpose.ESSENTIAL_SERVICES,
      );
      expect(component.processingPurposes[0].required).toBe(true);
    });

    it('should have functional analytics as optional', () => {
      const functionalPurpose = component.processingPurposes.find(
        (p) => p.purpose === ConsentPurpose.FUNCTIONAL_ANALYTICS,
      );
      expect(functionalPurpose?.required).toBe(false);
      expect(functionalPurpose?.isOptOut).toBe(true);
    });

    it('should have data categories for each purpose', () => {
      component.processingPurposes.forEach((purpose) => {
        expect(purpose.dataCategories).toBeDefined();
        expect(purpose.dataCategories.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Lifecycle', () => {
    it('should complete destroy subject on destroy', () => {
      const destroySpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
