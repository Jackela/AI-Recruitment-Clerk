import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
// Temporary local types until shared-dtos compilation is fixed
type JsonMap = Record<string, unknown>;
/**
 * Defines the shape of the capture consent dto.
 */
export interface CaptureConsentDto {
  userId: string;
  consents: Array<{
    purpose: string;
    granted: boolean;
  }>;
  consentVersion?: string;
}

/**
 * Defines the shape of the withdraw consent dto.
 */
export interface WithdrawConsentDto {
  userId: string;
  purpose: string;
  reason?: string;
}

/**
 * Defines the shape of the consent status dto.
 */
export interface ConsentStatusDto {
  userId: string;
  needsRenewal: boolean;
  lastUpdated: Date;
  purposes: Array<{
    purpose: string;
    status: 'granted' | 'denied';
    expiryDate?: string;
    grantedAt?: Date;
  }>;
}

/**
 * Defines the shape of the create rights request dto.
 */
export interface CreateRightsRequestDto {
  requestType: string;
  userId: string;
}

/**
 * Defines the shape of the data subject rights request.
 */
export interface DataSubjectRightsRequest {
  id: string;
  requestType: string;
  status: string;
}

/**
 * Defines the shape of the data export package.
 */
export interface DataExportPackage {
  downloadUrl: string;
  expiryDate: string;
}

/**
 * Defines the shape of the rights request status dto.
 */
export interface RightsRequestStatusDto {
  status: string;
  progress: number;
}

export enum DataExportFormat {
  JSON = 'json',
  CSV = 'csv',
}

/**
 * Defines the shape of the user consent profile.
 */
export interface UserConsentProfile {
  userId: string;
  consents: Array<{
    purpose: string;
    status: string;
  }>;
}
import { environment } from '../../environments/environment';

/**
 * Privacy API Service
 * Handles all GDPR compliance API interactions
 */
@Injectable({
  providedIn: 'root',
})
export class PrivacyApiService {
  private readonly baseUrl = `${environment.apiUrl}/privacy`;

  private http = inject(HttpClient);

  /**
   * CONSENT MANAGEMENT
   */

  /**
   * Capture user consent for various processing purposes
   */
  async captureConsent(
    captureConsentDto: CaptureConsentDto,
  ): Promise<UserConsentProfile> {
    return firstValueFrom(
      this.http.post<UserConsentProfile>(
        `${this.baseUrl}/consent`,
        captureConsentDto,
      ),
    );
  }

  /**
   * Withdraw consent for a specific purpose
   */
  async withdrawConsent(withdrawConsentDto: WithdrawConsentDto): Promise<void> {
    return firstValueFrom(
      this.http.put<void>(
        `${this.baseUrl}/consent/withdraw`,
        withdrawConsentDto,
      ),
    );
  }

  /**
   * Get current consent status for a user
   */
  async getConsentStatus(userId: string): Promise<ConsentStatusDto> {
    return firstValueFrom(
      this.http.get<ConsentStatusDto>(`${this.baseUrl}/consent/${userId}`),
    );
  }

  /**
   * DATA SUBJECT RIGHTS
   */

  /**
   * Create a data subject rights request
   */
  async createRightsRequest(
    createRequestDto: CreateRightsRequestDto,
  ): Promise<DataSubjectRightsRequest> {
    return firstValueFrom(
      this.http.post<DataSubjectRightsRequest>(
        `${this.baseUrl}/rights-request`,
        createRequestDto,
      ),
    );
  }

  /**
   * Get status of a rights request
   */
  async getRightsRequestStatus(
    requestId: string,
  ): Promise<RightsRequestStatusDto> {
    return firstValueFrom(
      this.http.get<RightsRequestStatusDto>(
        `${this.baseUrl}/rights-request/${requestId}`,
      ),
    );
  }

  /**
   * Export user data (Article 15 - Right to Access)
   */
  async exportUserData(
    userId: string,
    format: DataExportFormat = DataExportFormat.JSON,
  ): Promise<DataExportPackage> {
    const params = new HttpParams().set('format', format);
    return firstValueFrom(
      this.http.get<DataExportPackage>(
        `${this.baseUrl}/data-export/${userId}`,
        { params },
      ),
    );
  }

  /**
   * Request data erasure (Article 17 - Right to be Forgotten)
   */
  async requestDataErasure(
    userId: string,
    categories?: string[],
  ): Promise<void> {
    let params = new HttpParams();
    if (categories && categories.length > 0) {
      params = params.set('categories', categories.join(','));
    }

    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/user-data/${userId}`, { params }),
    );
  }

  /**
   * COOKIE CONSENT
   */

  /**
   * Set cookie consent preferences
   */
  async setCookieConsent(
    cookieConsent: JsonMap,
  ): Promise<JsonMap> {
    return firstValueFrom(
      this.http.post<JsonMap>(`${this.baseUrl}/cookie-consent`, cookieConsent),
    );
  }

  /**
   * Get cookie consent preferences
   */
  async getCookieConsent(deviceId: string): Promise<JsonMap> {
    return firstValueFrom(
      this.http.get<JsonMap>(`${this.baseUrl}/cookie-consent/${deviceId}`),
    );
  }

  /**
   * ADMINISTRATIVE
   */

  /**
   * Get data processing records (Article 30)
   */
  getProcessingRecords(): Observable<
    Array<{ id: string; date: string; purpose: string; dataTypes: string[] }>
  > {
    return this.http.get<
      Array<{ id: string; date: string; purpose: string; dataTypes: string[] }>
    >(`${this.baseUrl}/processing-records`);
  }

  /**
   * Get GDPR compliance status
   */
  getComplianceStatus(): Observable<JsonMap> {
    return this.http.get<JsonMap>(`${this.baseUrl}/compliance-status`);
  }

  /**
   * Privacy infrastructure health check
   */
  privacyHealthCheck(): Observable<JsonMap> {
    return this.http.post<JsonMap>(`${this.baseUrl}/privacy-health-check`, {});
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Download data export file
   */
  async downloadDataExport(downloadUrl: string): Promise<Blob> {
    return firstValueFrom(this.http.get(downloadUrl, { responseType: 'blob' }));
  }

  /**
   * Check if user has valid consent for a specific purpose
   */
  async hasValidConsentForPurpose(
    userId: string,
    purpose: string,
  ): Promise<boolean> {
    try {
      const consentStatus = await this.getConsentStatus(userId);
      const purposeStatus = consentStatus.purposes.find(
        (p) => p.purpose === purpose,
      );
      return (
        purposeStatus?.status === 'granted' &&
        !this.isConsentExpired(purposeStatus)
      );
    } catch (error) {
      console.error('Error checking consent status:', error);
      return false;
    }
  }

  /**
   * Check if consent is expired
   */
  private isConsentExpired(
    purposeStatus: ConsentStatusDto['purposes'][number],
  ): boolean {
    if (!purposeStatus.expiryDate) return false;
    return new Date() > new Date(purposeStatus.expiryDate);
  }

  /**
   * Get user-friendly display name for processing purpose
   */
  getPurposeDisplayName(purpose: string): string {
    const purposeNames: Record<string, string> = {
      essential_services: 'Essential Services',
      functional_analytics: 'Functional Analytics',
      behavioral_analytics: 'Enhanced Analytics',
      marketing_communications: 'Marketing Communications',
      third_party_sharing: 'Third-Party Integrations',
      personalization: 'Personalization',
      performance_monitoring: 'Performance Monitoring',
    };

    return (
      purposeNames[purpose] ||
      purpose.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    );
  }

  /**
   * Get GDPR-compliant retention period description
   */
  getRetentionPeriodDescription(purpose: string): string {
    const retentionPeriods: Record<string, string> = {
      essential_services:
        'Until account deletion or 7 years after last activity',
      functional_analytics: '2 years from collection',
      behavioral_analytics: '2 years from collection',
      marketing_communications:
        'Until consent withdrawn or 3 years of inactivity',
      third_party_sharing: 'As long as third-party processing continues',
      personalization: '1 year from last use of personalized features',
      performance_monitoring: '1 year from collection',
    };

    return retentionPeriods[purpose] || 'As specified in our Privacy Policy';
  }

  /**
   * Validate consent request before submission
   */
  validateConsentRequest(captureConsentDto: CaptureConsentDto): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!captureConsentDto.userId) {
      errors.push('User ID is required');
    }

    if (
      !captureConsentDto.consents ||
      captureConsentDto.consents.length === 0
    ) {
      errors.push('At least one consent choice is required');
    }

    // Validate each consent
    captureConsentDto.consents.forEach((consent, index) => {
      if (!consent.purpose) {
        errors.push(`Consent ${index + 1}: Purpose is required`);
      }

      if (typeof consent.granted !== 'boolean') {
        errors.push(
          `Consent ${index + 1}: Granted status must be true or false`,
        );
      }
    });

    // Check for essential services consent
    const essentialConsent = captureConsentDto.consents.find(
      (c) => c.purpose === 'essential_services',
    );

    if (essentialConsent && !essentialConsent.granted) {
      errors.push(
        'Consent for essential services is required to use the platform',
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate consent summary for display
   */
  generateConsentSummary(consentStatus: ConsentStatusDto): {
    granted: number;
    denied: number;
    total: number;
  } {
    const granted = consentStatus.purposes.filter(
      (p) => p.status === 'granted',
    ).length;
    const denied = consentStatus.purposes.filter(
      (p) => p.status === 'denied',
    ).length;
    const total = consentStatus.purposes.length;

    return { granted, denied, total };
  }

  /**
   * Check if privacy policy acceptance is required
   */
  isPrivacyPolicyAcceptanceRequired(): boolean {
    // Check if user has previously accepted privacy policy
    const lastAcceptance = localStorage.getItem('privacy_policy_accepted_date');
    if (!lastAcceptance) return true;

    // Check if acceptance is older than 1 year
    const acceptanceDate = new Date(lastAcceptance);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return acceptanceDate < oneYearAgo;
  }

  /**
   * Mark privacy policy as accepted
   */
  markPrivacyPolicyAccepted(): void {
    localStorage.setItem(
      'privacy_policy_accepted_date',
      new Date().toISOString(),
    );
  }
}
