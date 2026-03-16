import { Injectable } from '@angular/core';
import type { HttpClient, HttpErrorResponse } from '@angular/common/http';
import type { Observable, BehaviorSubject } from 'rxjs';
import { throwError, of } from 'rxjs';
import {
  catchError,
  map,
  tap,
  retryWhen,
  delayWhen,
  take,
  concat,
} from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Authentication token response from server.
 */
export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * User profile information.
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  roles: string[];
  organizationId?: string;
  avatar?: string;
}

/**
 * Login credentials.
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Registration data.
 */
export interface RegistrationData {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
}

/**
 * Password reset request.
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Authentication state.
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Provides authentication functionality.
 * Handles login, logout, token management, and user session.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = environment.apiUrl;

  private authState: BehaviorSubject<AuthState> =
    new BehaviorSubject<AuthState>({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    });

  public readonly authState$ = this.authState.asObservable();

  private maxRetryAttempts = 3;
  private retryDelay = 1000;

  constructor(private http: HttpClient) {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from stored tokens.
   */
  private initializeAuth(): void {
    const token = this.getStoredToken();
    if (token) {
      this.authState.next({
        ...this.authState.value,
        isAuthenticated: true,
        isLoading: true,
      });
      this.fetchUserProfile().subscribe({
        next: (user) => {
          this.authState.next({
            isAuthenticated: true,
            user,
            isLoading: false,
            error: null,
          });
        },
        error: () => {
          this.logout();
        },
      });
    }
  }

  /**
   * Authenticate user with credentials.
   * @param credentials - Login credentials
   * @returns Observable of auth token response
   */
  public login(credentials: LoginCredentials): Observable<AuthTokenResponse> {
    this.authState.next({
      ...this.authState.value,
      isLoading: true,
      error: null,
    });

    return this.http
      .post<AuthTokenResponse>(`${this.baseUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          this.storeTokens(response, credentials.rememberMe);
        }),
        tap(() => {
          this.fetchUserProfile().subscribe({
            next: (user) => {
              this.authState.next({
                isAuthenticated: true,
                user,
                isLoading: false,
                error: null,
              });
            },
            error: (error) => {
              this.authState.next({
                ...this.authState.value,
                isLoading: false,
                error: this.getErrorMessage(error),
              });
            },
          });
        }),
        retryWhen((errors) =>
          errors.pipe(
            delayWhen(() => timer(this.retryDelay)),
            take(this.maxRetryAttempts),
            concat(throwError(() => new Error('Max retries exceeded'))),
          ),
        ),
        catchError((error) => {
          this.authState.next({
            ...this.authState.value,
            isLoading: false,
            error: this.getErrorMessage(error),
          });
          return throwError(() => error);
        }),
      );
  }

  /**
   * Register a new user.
   * @param data - Registration data
   * @returns Observable of auth token response
   */
  public register(data: RegistrationData): Observable<AuthTokenResponse> {
    this.authState.next({
      ...this.authState.value,
      isLoading: true,
      error: null,
    });

    return this.http
      .post<AuthTokenResponse>(`${this.baseUrl}/auth/register`, data)
      .pipe(
        tap((response) => {
          this.storeTokens(response, false);
        }),
        tap(() => {
          this.fetchUserProfile().subscribe({
            next: (user) => {
              this.authState.next({
                isAuthenticated: true,
                user,
                isLoading: false,
                error: null,
              });
            },
          });
        }),
        catchError((error) => {
          this.authState.next({
            ...this.authState.value,
            isLoading: false,
            error: this.getErrorMessage(error),
          });
          return throwError(() => error);
        }),
      );
  }

  /**
   * Logout current user.
   */
  public logout(): void {
    const refreshToken =
      localStorage.getItem('refresh_token') ||
      sessionStorage.getItem('refresh_token');

    if (refreshToken) {
      this.http
        .post(`${this.baseUrl}/auth/logout`, { refreshToken })
        .subscribe({
          error: () => {
            // Silent fail - logout anyway
          },
        });
    }

    this.clearTokens();
    this.authState.next({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    });
  }

  /**
   * Refresh access token.
   * @returns Observable of new auth token response
   */
  public refreshToken(): Observable<AuthTokenResponse> {
    const refreshToken =
      localStorage.getItem('refresh_token') ||
      sessionStorage.getItem('refresh_token');

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<AuthTokenResponse>(`${this.baseUrl}/auth/refresh`, { refreshToken })
      .pipe(
        tap((response) => {
          this.storeTokens(response, this.isRememberMe());
        }),
        catchError((error) => {
          this.logout();
          return throwError(() => error);
        }),
      );
  }

  /**
   * Request password reset.
   * @param request - Password reset request
   * @returns Observable of success status
   */
  public requestPasswordReset(
    request: PasswordResetRequest,
  ): Observable<boolean> {
    return this.http
      .post<{
        success: boolean;
      }>(`${this.baseUrl}/auth/password-reset-request`, request)
      .pipe(
        map((response) => response.success),
        catchError((error) => {
          return throwError(() => error);
        }),
      );
  }

  /**
   * Reset password with token.
   * @param token - Reset token
   * @param newPassword - New password
   * @returns Observable of success status
   */
  public resetPassword(
    token: string,
    newPassword: string,
  ): Observable<boolean> {
    return this.http
      .post<{ success: boolean }>(`${this.baseUrl}/auth/password-reset`, {
        token,
        newPassword,
      })
      .pipe(
        map((response) => response.success),
        catchError((error) => {
          return throwError(() => error);
        }),
      );
  }

  /**
   * Get current authentication state.
   * @returns Current auth state
   */
  public getAuthState(): AuthState {
    return this.authState.value;
  }

  /**
   * Check if user is authenticated.
   * @returns True if authenticated
   */
  public isAuthenticated(): boolean {
    return this.authState.value.isAuthenticated && !!this.getStoredToken();
  }

  /**
   * Get current user profile.
   * @returns User profile or null
   */
  public getCurrentUser(): UserProfile | null {
    return this.authState.value.user;
  }

  /**
   * Get access token.
   * @returns Access token or null
   */
  public getAccessToken(): string | null {
    return this.getStoredToken();
  }

  /**
   * Check if user has specific role.
   * @param role - Role to check
   * @returns True if user has role
   */
  public hasRole(role: string): boolean {
    const user = this.authState.value.user;
    return user?.roles.includes(role) ?? false;
  }

  /**
   * Fetch user profile from server.
   * @returns Observable of user profile
   */
  private fetchUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/auth/profile`);
  }

  /**
   * Store authentication tokens.
   * @param response - Token response
   * @param rememberMe - Whether to persist in localStorage
   */
  private storeTokens(response: AuthTokenResponse, rememberMe?: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('access_token', response.accessToken);
    storage.setItem('refresh_token', response.refreshToken);
    storage.setItem(
      'token_expires',
      (Date.now() + response.expiresIn * 1000).toString(),
    );
    storage.setItem('remember_me', rememberMe ? 'true' : 'false');
  }

  /**
   * Clear all stored tokens.
   */
  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires');
    localStorage.removeItem('remember_me');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('token_expires');
    sessionStorage.removeItem('remember_me');
  }

  /**
   * Get stored access token.
   * @returns Token or null
   */
  private getStoredToken(): string | null {
    return (
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token')
    );
  }

  /**
   * Check if remember me was selected.
   * @returns True if remember me
   */
  private isRememberMe(): boolean {
    return localStorage.getItem('remember_me') === 'true';
  }

  /**
   * Get user-friendly error message.
   * @param error - HTTP error
   * @returns Error message
   */
  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
      return error.error.message;
    }

    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Invalid credentials. Please try again.';
      case 403:
        return 'Access denied. You do not have permission.';
      case 404:
        return 'User not found.';
      case 409:
        return 'An account with this email already exists.';
      case 429:
        return 'Too many attempts. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 0:
        return 'Network error. Please check your connection.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

// Import timer for retry logic
import { timer } from 'rxjs';
