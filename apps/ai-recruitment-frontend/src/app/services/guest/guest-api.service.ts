import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DeviceIdService } from './device-id.service';

export interface GuestUsageResponse {
  canUse: boolean;
  remainingCount: number;
  needsFeedbackCode: boolean;
  feedbackCode?: string;
}

export interface GuestStatusResponse {
  deviceId: string;
  usageCount: number;
  maxUsage: number;
  isLimited: boolean;
  feedbackCodeStatus?: 'generated' | 'redeemed';
  lastUsed: Date;
}

export interface FeedbackCodeResponse {
  feedbackCode: string;
  surveyUrl: string;
  message: string;
}

export interface ResumeAnalysisResponse {
  success: boolean;
  data: {
    analysisId: string;
    filename: string;
    uploadedAt: string;
    estimatedCompletionTime: string;
    isGuestMode: boolean;
    fileSize: number;
    remainingUsage?: number;
  };
}

export interface AnalysisResultsResponse {
  success: boolean;
  data: {
    analysisId: string;
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    results?: {
      personalInfo: any;
      skills: any[];
      experience: any;
      education: any[];
      summary: any;
    };
    completedAt?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GuestApiService {
  private readonly baseUrl = '/api/guest';

  constructor(
    private http: HttpClient,
    private deviceIdService: DeviceIdService
  ) {}

  /**
   * Get headers with device ID for guest API calls
   */
  private getGuestHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Device-ID': this.deviceIdService.getDeviceId()
    });
  }

  /**
   * Check guest usage status
   */
  getUsageStatus(): Observable<GuestUsageResponse> {
    return this.http.get<GuestUsageResponse>(`${this.baseUrl}/status`, {
      headers: this.getGuestHeaders()
    });
  }

  /**
   * Get detailed guest status
   */
  getGuestDetails(): Observable<GuestStatusResponse> {
    return this.http.get<GuestStatusResponse>(`${this.baseUrl}/details`, {
      headers: this.getGuestHeaders()
    });
  }

  /**
   * Generate feedback code for guest user
   */
  generateFeedbackCode(): Observable<FeedbackCodeResponse> {
    return this.http.post<FeedbackCodeResponse>(
      `${this.baseUrl}/feedback-code`, 
      {},
      { headers: this.getGuestHeaders() }
    );
  }

  /**
   * Redeem feedback code
   */
  redeemFeedbackCode(feedbackCode: string): Observable<{success: boolean; message: string}> {
    return this.http.post<{success: boolean; message: string}>(
      `${this.baseUrl}/redeem`,
      { feedbackCode },
      { headers: this.getGuestHeaders() }
    );
  }

  /**
   * Check if guest can use service (and increment usage)
   */
  checkUsage(): Observable<{canUse: boolean; message: string}> {
    return this.http.post<{canUse: boolean; message: string}>(
      `${this.baseUrl}/check-usage`,
      {},
      { headers: this.getGuestHeaders() }
    );
  }

  /**
   * Upload and analyze resume (guest mode)
   */
  analyzeResume(
    file: File, 
    candidateName?: string, 
    candidateEmail?: string, 
    notes?: string
  ): Observable<ResumeAnalysisResponse> {
    const formData = new FormData();
    formData.append('resume', file);
    
    if (candidateName) formData.append('candidateName', candidateName);
    if (candidateEmail) formData.append('candidateEmail', candidateEmail);
    if (notes) formData.append('notes', notes);

    return this.http.post<ResumeAnalysisResponse>(
      `${this.baseUrl}/resume/analyze`,
      formData,
      { headers: this.getGuestHeaders() }
    );
  }

  /**
   * Get analysis results
   */
  getAnalysisResults(analysisId: string): Observable<AnalysisResultsResponse> {
    return this.http.get<AnalysisResultsResponse>(
      `${this.baseUrl}/resume/analysis/${analysisId}`,
      { headers: this.getGuestHeaders() }
    );
  }

  /**
   * Get demo analysis (for showcasing)
   */
  getDemoAnalysis(): Observable<AnalysisResultsResponse> {
    return this.http.get<AnalysisResultsResponse>(
      `${this.baseUrl}/resume/demo-analysis`,
      { headers: this.getGuestHeaders() }
    );
  }

  /**
   * Get service statistics (public endpoint)
   */
  getServiceStats(): Observable<{
    totalGuests: number;
    activeGuests: number;
    pendingFeedbackCodes: number;
    redeemedFeedbackCodes: number;
  }> {
    return this.http.get<{
      totalGuests: number;
      activeGuests: number;
      pendingFeedbackCodes: number;
      redeemedFeedbackCodes: number;
    }>(`${this.baseUrl}/stats`, { headers: this.getGuestHeaders() });
  }
}