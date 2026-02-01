import { Injectable } from '@angular/core';
import type { HttpClient} from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { DeviceIdService } from './device-id.service';
import type { DetailedAnalysisResult } from '../../interfaces/detailed-analysis.interface';

/**
 * Defines the shape of the guest usage response.
 */
export interface GuestUsageResponse {
  canUse: boolean;
  remainingCount: number;
  needsFeedbackCode: boolean;
  feedbackCode?: string;
}

/**
 * Defines the shape of the guest status response.
 */
export interface GuestStatusResponse {
  deviceId: string;
  usageCount: number;
  maxUsage: number;
  isLimited: boolean;
  feedbackCodeStatus?: 'generated' | 'redeemed';
  lastUsed: Date;
}

/**
 * Defines the shape of the feedback code response.
 */
export interface FeedbackCodeResponse {
  feedbackCode: string;
  surveyUrl: string;
  message: string;
}

/**
 * Defines the shape of the resume analysis response.
 */
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

/**
 * Defines the shape of the personal info.
 */
export interface PersonalInfo {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
}

/**
 * Defines the shape of the skill.
 */
export interface Skill {
  name: string;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  yearsOfExperience?: number;
}

/**
 * Defines the shape of the experience.
 */
export interface Experience {
  totalYears: number;
  positions: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    duration: string;
    description?: string;
    technologies?: string[];
  }>;
}

/**
 * Defines the shape of the education.
 */
export interface Education {
  degree: string;
  institution: string;
  location?: string;
  graduationYear?: number;
  gpa?: number;
  honors?: string[];
  relevantCoursework?: string[];
}

/**
 * Defines the shape of the analysis summary.
 */
export interface AnalysisSummary {
  overallScore: number;
  strengths: string[];
  recommendations: string[];
  keyHighlights: string[];
  improvementAreas: string[];
}

/**
 * Defines the shape of the analysis results response.
 */
export interface AnalysisResultsResponse {
  success: boolean;
  data: {
    analysisId: string;
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    results?: {
      personalInfo: PersonalInfo;
      skills: Skill[];
      experience: Experience;
      education: Education[];
      summary: AnalysisSummary;
    };
    completedAt?: string;
  };
}

/**
 * Provides guest api functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class GuestApiService {
  private readonly baseUrl = '/api/guest';

  /**
   * Initializes a new instance of the Guest API Service.
   * @param http - The http.
   * @param deviceIdService - The device id service.
   */
  constructor(
    private http: HttpClient,
    private deviceIdService: DeviceIdService,
  ) {}

  /**
   * Get headers with device ID for guest API calls
   */
  private getGuestHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-Device-ID': this.deviceIdService.getDeviceId(),
    });
  }

  /**
   * Check guest usage status
   */
  getUsageStatus(): Observable<GuestUsageResponse> {
    return this.http.get<GuestUsageResponse>(`${this.baseUrl}/status`, {
      headers: this.getGuestHeaders(),
    });
  }

  /**
   * Get detailed guest status
   */
  getGuestDetails(): Observable<GuestStatusResponse> {
    return this.http.get<GuestStatusResponse>(`${this.baseUrl}/details`, {
      headers: this.getGuestHeaders(),
    });
  }

  /**
   * Generate feedback code for guest user
   */
  generateFeedbackCode(): Observable<FeedbackCodeResponse> {
    return this.http.post<FeedbackCodeResponse>(
      `${this.baseUrl}/feedback-code`,
      {},
      { headers: this.getGuestHeaders() },
    );
  }

  /**
   * Redeem feedback code
   */
  redeemFeedbackCode(
    feedbackCode: string,
  ): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/redeem`,
      { feedbackCode },
      { headers: this.getGuestHeaders() },
    );
  }

  /**
   * Check if guest can use service (and increment usage)
   */
  checkUsage(): Observable<{ canUse: boolean; message: string }> {
    return this.http.post<{ canUse: boolean; message: string }>(
      `${this.baseUrl}/check-usage`,
      {},
      { headers: this.getGuestHeaders() },
    );
  }

  /**
   * Upload and analyze resume (guest mode)
   */
  analyzeResume(
    file: File,
    candidateName?: string,
    candidateEmail?: string,
    notes?: string,
  ): Observable<ResumeAnalysisResponse> {
    const formData = new FormData();
    formData.append('resume', file);

    if (candidateName) formData.append('candidateName', candidateName);
    if (candidateEmail) formData.append('candidateEmail', candidateEmail);
    if (notes) formData.append('notes', notes);

    return this.http.post<ResumeAnalysisResponse>(
      `${this.baseUrl}/resume/analyze`,
      formData,
      { headers: this.getGuestHeaders() },
    );
  }

  /**
   * Get analysis results
   */
  getAnalysisResults(analysisId: string): Observable<AnalysisResultsResponse> {
    return this.http.get<AnalysisResultsResponse>(
      `${this.baseUrl}/resume/analysis/${analysisId}`,
      { headers: this.getGuestHeaders() },
    );
  }

  /**
   * Get demo analysis (for showcasing)
   */
  getDemoAnalysis(): Observable<AnalysisResultsResponse> {
    return this.http.get<AnalysisResultsResponse>(
      `${this.baseUrl}/resume/demo-analysis`,
      { headers: this.getGuestHeaders() },
    );
  }

  /**
   * Get detailed analysis results for the results page
   */
  getDetailedResults(sessionId: string): Observable<DetailedAnalysisResult> {
    return this.http.get<DetailedAnalysisResult>(
      `${this.baseUrl}/resume/detailed-results/${sessionId}`,
      { headers: this.getGuestHeaders() },
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
    return this.http
      .get(`${this.baseUrl}/stats`, {
        headers: this.getGuestHeaders(),
        responseType: 'text',
      })
      .pipe(map((rawResponse) => this.parseGuestStats(rawResponse)));
  }

  private parseGuestStats(
    rawResponse: unknown,
  ): {
    totalGuests: number;
    activeGuests: number;
    pendingFeedbackCodes: number;
    redeemedFeedbackCodes: number;
  } {
    let parsed: unknown = {};

    if (typeof rawResponse === 'string') {
      const trimmed = rawResponse.trim();
      if (trimmed.length > 0) {
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          // Keep fallback if parsing fails.
        }
      }
    } else if (typeof rawResponse === 'object' && rawResponse !== null) {
      parsed = rawResponse;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      parsed = {};
    }

    const data = parsed as Record<string, unknown>;

    const toNumber = (value: unknown): number => {
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : 0;
      }
      return 0;
    };

    return {
      totalGuests: toNumber(data.totalGuests),
      activeGuests: toNumber(data.activeGuests),
      pendingFeedbackCodes: toNumber(data.pendingFeedbackCodes),
      redeemedFeedbackCodes: toNumber(data.redeemedFeedbackCodes),
    };
  }
}
