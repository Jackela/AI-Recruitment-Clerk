import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
// import { takeUntil } from 'rxjs'; // Reserved for future use
import { PrivacyApiService, CaptureConsentDto, ConsentStatusDto } from '../../services/privacy-api.service';

// Temporary local types until shared-dtos compilation is fixed
export enum ConsentPurpose {
  ESSENTIAL_SERVICES = 'essential_services',
  FUNCTIONAL_ANALYTICS = 'functional_analytics',
  BEHAVIORAL_ANALYTICS = 'behavioral_analytics',
  MARKETING_COMMUNICATIONS = 'marketing_communications',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  PERSONALIZATION = 'personalization',
  PERFORMANCE_MONITORING = 'performance_monitoring'
}

export enum ConsentStatus {
  GRANTED = 'granted',
  DENIED = 'denied',
  PENDING = 'pending',
  WITHDRAWN = 'withdrawn'
}

export enum ConsentMethod {
  EXPLICIT = 'explicit',
  IMPLIED = 'implied',
  OPT_OUT = 'opt_out',
  EXPLICIT_OPT_IN = 'explicit_opt_in'
}

export enum DataCategory {
  PERSONAL = 'personal',
  SENSITIVE = 'sensitive',
  TECHNICAL = 'technical',
  AUTHENTICATION = 'authentication',
  PROFILE_INFORMATION = 'profile_information',
  RESUME_CONTENT = 'resume_content',
  BEHAVIORAL_DATA = 'behavioral_data',
  SYSTEM_LOGS = 'system_logs',
  JOB_PREFERENCES = 'job_preferences',
  DEVICE_INFORMATION = 'device_information',
  COMMUNICATION_PREFERENCES = 'communication_preferences'
}

export interface ConsentGrantDto {
  purpose: ConsentPurpose;
  granted: boolean;
  method: ConsentMethod;
}

export interface ProcessingPurposeInfo {
  purpose: ConsentPurpose;
  description: string;
  displayName: string;
  required: boolean;
  isRequired: boolean;
  isOptOut: boolean;
  retentionPeriod: string;
  legalBasis: string;
  dataCategories: DataCategory[];
  thirdParties: string[];
}
import { ToastService } from '../../services/toast.service';

/**
 * GDPR Consent Management Component
 * Provides comprehensive consent capture and management interface
 */
@Component({
  selector: 'app-consent-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './consent-management.component.html',
  styleUrls: ['./consent-management.component.scss']
})
export class ConsentManagementComponent implements OnInit, OnDestroy {
  @Input() userId?: string;
  @Input() mode: 'initial' | 'update' | 'review' = 'initial';
  @Input() showAllPurposes = true;
  @Output() consentCaptured = new EventEmitter<ConsentStatusDto>();
  @Output() consentUpdated = new EventEmitter<ConsentStatusDto>();

  private destroy$ = new Subject<void>();

  consentForm!: FormGroup;
  isLoading = false;
  currentConsentStatus?: ConsentStatusDto;
  
  // Processing purpose configurations
  readonly processingPurposes: ProcessingPurposeInfo[] = [
    {
      purpose: ConsentPurpose.ESSENTIAL_SERVICES,
      displayName: 'Essential Services',
      description: 'Core functionality required for the recruitment platform to work, including account management and resume processing.',
      legalBasis: 'Contract performance (GDPR Article 6(1)(b))',
      dataCategories: [DataCategory.AUTHENTICATION, DataCategory.PROFILE_INFORMATION, DataCategory.RESUME_CONTENT],
      required: true,
      isRequired: true,
      isOptOut: false,
      retentionPeriod: 'Until account deletion or 7 years after last activity',
      thirdParties: ['Google Gemini AI for resume analysis']
    },
    {
      purpose: ConsentPurpose.FUNCTIONAL_ANALYTICS,
      displayName: 'Functional Analytics',
      description: 'Basic usage statistics to improve platform performance and user experience. No personal identification.',
      legalBasis: 'Legitimate interests (GDPR Article 6(1)(f))',
      dataCategories: [DataCategory.BEHAVIORAL_DATA, DataCategory.SYSTEM_LOGS],
      required: false,
      isRequired: false,
      isOptOut: true,
      retentionPeriod: '2 years from collection',
      thirdParties: []
    },
    {
      purpose: ConsentPurpose.BEHAVIORAL_ANALYTICS,
      displayName: 'Enhanced Analytics',
      description: 'Detailed behavioral analysis to personalize your experience and provide better job recommendations.',
      legalBasis: 'Consent (GDPR Article 6(1)(a))',
      dataCategories: [DataCategory.BEHAVIORAL_DATA, DataCategory.JOB_PREFERENCES, DataCategory.DEVICE_INFORMATION],
      required: false,
      isRequired: false,
      isOptOut: true,
      retentionPeriod: '2 years from collection',
      thirdParties: []
    },
    {
      purpose: ConsentPurpose.MARKETING_COMMUNICATIONS,
      displayName: 'Marketing Communications',
      description: 'Email newsletters, job alerts, and promotional communications about new features.',
      legalBasis: 'Consent (GDPR Article 6(1)(a))',
      dataCategories: [DataCategory.COMMUNICATION_PREFERENCES, DataCategory.PROFILE_INFORMATION],
      required: false,
      isRequired: false,
      isOptOut: true,
      retentionPeriod: 'Until consent withdrawn or 3 years of inactivity',
      thirdParties: []
    },
    {
      purpose: ConsentPurpose.THIRD_PARTY_SHARING,
      displayName: 'Third-Party Integrations',
      description: 'Sharing resume data with external AI services for enhanced analysis and job matching.',
      legalBasis: 'Consent (GDPR Article 6(1)(a))',
      dataCategories: [DataCategory.RESUME_CONTENT, DataCategory.JOB_PREFERENCES],
      required: false,
      isRequired: false,
      isOptOut: true,
      retentionPeriod: 'As long as third-party processing continues',
      thirdParties: ['Google Gemini AI', 'Partner job boards']
    }
  ];

  readonly ConsentPurpose = ConsentPurpose;

  constructor(
    private fb: FormBuilder,
    private privacyApi: PrivacyApiService,
    private toast: ToastService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.userId && this.mode !== 'initial') {
      this.loadCurrentConsent();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const purposeControls = this.processingPurposes.map(purpose => 
      this.fb.group({
        purpose: [purpose.purpose],
        granted: [purpose.isRequired, purpose.isRequired ? [] : []], // Required purposes default to true
        method: [ConsentMethod.EXPLICIT_OPT_IN],
        consentText: [`I consent to ${purpose.displayName.toLowerCase()}: ${purpose.description}`]
      })
    );

    this.consentForm = this.fb.group({
      consents: this.fb.array(purposeControls),
      privacyPolicyAccepted: [false, [Validators.requiredTrue]],
      ageConfirmation: [false, [Validators.requiredTrue]],
      consentVersion: ['1.0']
    });
  }

  get consentsArray(): FormArray {
    return this.consentForm.get('consents') as FormArray;
  }

  getPurposeInfo(index: number): ProcessingPurposeInfo {
    return this.processingPurposes[index];
  }

  isPurposeRequired(index: number): boolean {
    return this.processingPurposes[index].isRequired;
  }

  canWithdrawPurpose(index: number): boolean {
    return this.processingPurposes[index].isOptOut;
  }

  private async loadCurrentConsent(): Promise<void> {
    if (!this.userId) return;

    this.isLoading = true;
    try {
      this.currentConsentStatus = await this.privacyApi.getConsentStatus(this.userId);
      this.populateFormWithCurrentConsent();
    } catch (error) {
      this.toast.error('Failed to load current consent preferences');
      console.error('Error loading consent status:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private populateFormWithCurrentConsent(): void {
    if (!this.currentConsentStatus) return;

    this.currentConsentStatus.purposes.forEach((purposeStatus, index) => {
      const consentGroup = this.consentsArray.at(index) as FormGroup;
      if (consentGroup) {
        consentGroup.patchValue({
          granted: purposeStatus.status === ConsentStatus.GRANTED
        });
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.consentForm.invalid || !this.userId) {
      this.markFormGroupTouched(this.consentForm);
      return;
    }

    this.isLoading = true;
    try {
      const formValue = this.consentForm.value;
      
      const captureConsentDto: CaptureConsentDto = {
        userId: this.userId,
        consents: formValue.consents.map((consent: any) => ({
          purpose: consent.purpose,
          granted: consent.granted,
          method: consent.method,
          dataCategories: this.getDataCategoriesForPurpose(consent.purpose),
          consentText: consent.consentText
        } as ConsentGrantDto)),
        consentVersion: formValue.consentVersion
      };

      await this.privacyApi.captureConsent(captureConsentDto);
      
      // Get updated status
      const updatedStatus = await this.privacyApi.getConsentStatus(this.userId);
      
      if (this.mode === 'initial') {
        this.consentCaptured.emit(updatedStatus);
      } else {
        this.consentUpdated.emit(updatedStatus);
      }
      
      this.toast.success('Consent preferences saved successfully');
      
    } catch (error) {
      this.toast.error('Failed to save consent preferences');
      console.error('Error capturing consent:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async withdrawConsent(purpose: ConsentPurpose): Promise<void> {
    if (!this.userId) return;

    const purposeInfo = this.processingPurposes.find(p => p.purpose === purpose);
    if (!purposeInfo?.isOptOut) {
      this.toast.warning('This consent cannot be withdrawn as it is required for essential services');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to withdraw consent for ${purposeInfo.displayName}? ` +
      'This will stop the related processing activities immediately.'
    );

    if (!confirmed) return;

    this.isLoading = true;
    try {
      await this.privacyApi.withdrawConsent({
        userId: this.userId,
        purpose,
        reason: 'User requested withdrawal'
      });

      // Reload consent status
      await this.loadCurrentConsent();
      
      this.toast.success(`Consent for ${purposeInfo.displayName} has been withdrawn`);
      
      if (this.mode === 'update') {
        const updatedStatus = await this.privacyApi.getConsentStatus(this.userId);
        this.consentUpdated.emit(updatedStatus);
      }
      
    } catch (error) {
      this.toast.error('Failed to withdraw consent');
      console.error('Error withdrawing consent:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private getDataCategoriesForPurpose(purpose: ConsentPurpose): string[] {
    const purposeInfo = this.processingPurposes.find(p => p.purpose === purpose);
    return purposeInfo?.dataCategories || [];
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(c => {
          if (c instanceof FormGroup) {
            this.markFormGroupTouched(c);
          }
        });
      }
    });
  }

  // Utility methods for template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.consentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.consentForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required'] || field.errors['requiredTrue']) {
        return 'This field is required';
      }
    }
    return '';
  }

  getCurrentConsentStatus(purpose: ConsentPurpose): ConsentStatus | undefined {
    if (!this.currentConsentStatus) return undefined;
    const purposeStatus = this.currentConsentStatus.purposes.find(p => p.purpose === purpose);
    return purposeStatus?.status as ConsentStatus;
  }

  getConsentDate(purpose: ConsentPurpose): Date | undefined {
    if (!this.currentConsentStatus) return undefined;
    const purposeStatus = this.currentConsentStatus.purposes.find(p => p.purpose === purpose);
    return purposeStatus?.grantedAt;
  }

  needsRenewal(): boolean {
    return this.currentConsentStatus?.needsRenewal || false;
  }
}