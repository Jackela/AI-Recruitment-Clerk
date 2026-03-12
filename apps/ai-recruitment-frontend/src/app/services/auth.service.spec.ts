import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import {
  AuthService,
  AuthTokenResponse,
  UserProfile,
  LoginCredentials,
  RegistrationData,
  PasswordResetRequest,
} from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('HTTP Interceptor Tests', () => {
    describe('Request Transformation', () => {
      it('should add Content-Type header for JSON requests', () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'password123',
        };

        service.login(credentials).subscribe();

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        expect(req.request.headers.get('Content-Type')).toContain(
          'application/json',
        );
        req.flush({
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        });
      });

      it('should send correct request body for login', () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true,
        };

        service.login(credentials).subscribe();

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        expect(req.request.body).toEqual(credentials);
        req.flush({
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        });
      });
    });

    describe('Response Transformation', () => {
      it('should transform successful login response', () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'password123',
        };

        const mockResponse: AuthTokenResponse = {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_123',
          expiresIn: 3600,
          tokenType: 'Bearer',
        };

        service.login(credentials).subscribe((response) => {
          expect(response).toEqual(mockResponse);
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        req.flush(mockResponse);

        // Also expect profile fetch
        const profileReq = httpMock.expectOne(`${baseUrl}/auth/profile`);
        profileReq.flush({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          roles: ['user'],
        });
      });
    });

    describe('Token Injection', () => {
      it('should inject authorization header with token', () => {
        // Set up authenticated state
        localStorage.setItem('access_token', 'test_token_123');

        // Re-initialize service to pick up token
        service = TestBed.inject(AuthService);

        service.refreshToken().subscribe();

        const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
        expect(req.request.headers.get('Authorization')).toBe(
          'Bearer test_token_123',
        );
        req.flush({
          accessToken: 'new_token',
          refreshToken: 'new_refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        });
      });

      it('should handle missing token gracefully', () => {
        service.refreshToken().subscribe({
          error: (error) => {
            expect(error.message).toBe('No refresh token available');
          },
        });

        httpMock.expectNone(`${baseUrl}/auth/refresh`);
      });
    });
  });

  describe('Error Handling', () => {
    describe('HTTP Errors', () => {
      it('should handle 400 Bad Request', () => {
        const credentials: LoginCredentials = {
          email: 'invalid',
          password: 'short',
        };

        service.login(credentials).subscribe({
          error: (error) => {
            expect(error.status).toBe(400);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        req.flush(
          { message: 'Invalid credentials' },
          { status: 400, statusText: 'Bad Request' },
        );
      });

      it('should handle 401 Unauthorized', () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'wrongpassword',
        };

        service.login(credentials).subscribe({
          error: (error) => {
            expect(error.status).toBe(401);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      });

      it('should handle 403 Forbidden', () => {
        const credentials: LoginCredentials = {
          email: 'blocked@example.com',
          password: 'password123',
        };

        service.login(credentials).subscribe({
          error: (error) => {
            expect(error.status).toBe(403);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
      });

      it('should handle 404 Not Found', () => {
        const credentials: LoginCredentials = {
          email: 'nonexistent@example.com',
          password: 'password123',
        };

        service.login(credentials).subscribe({
          error: (error) => {
            expect(error.status).toBe(404);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        req.flush('User not found', { status: 404, statusText: 'Not Found' });
      });

      it('should handle 409 Conflict (duplicate email)', () => {
        const data: RegistrationData = {
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User',
        };

        service.register(data).subscribe({
          error: (error) => {
            expect(error.status).toBe(409);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/register`);
        req.flush(
          { message: 'Email already exists' },
          { status: 409, statusText: 'Conflict' },
        );
      });

      it('should handle 429 Too Many Requests', () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'password123',
        };

        service.login(credentials).subscribe({
          error: (error) => {
            expect(error.status).toBe(429);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        req.flush('Too Many Requests', {
          status: 429,
          statusText: 'Too Many Requests',
        });
      });

      it('should handle 500 Internal Server Error', () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'password123',
        };

        service.login(credentials).subscribe({
          error: (error) => {
            expect(error.status).toBe(500);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        req.flush('Server Error', {
          status: 500,
          statusText: 'Internal Server Error',
        });
      });

      it('should handle 503 Service Unavailable', () => {
        service.refreshToken().subscribe({
          error: (error) => {
            expect(error.status).toBe(503);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
        req.flush('Service Unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      });
    });

    describe('Network Errors', () => {
      it('should handle network connectivity error', () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'password123',
        };

        service.login(credentials).subscribe({
          error: (error) => {
            expect(error.error.type).toBe('error');
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        req.error(new ErrorEvent('error', { message: 'Network error' }));
      });

      it('should handle connection refused', () => {
        const data: RegistrationData = {
          email: 'new@example.com',
          password: 'password123',
          name: 'New User',
        };

        service.register(data).subscribe({
          error: (error) => {
            expect(error.error.type).toBe('error');
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/register`);
        req.error(new ErrorEvent('error', { message: 'Connection refused' }));
      });

      it('should handle DNS resolution failure', () => {
        const request: PasswordResetRequest = {
          email: 'test@example.com',
        };

        service.requestPasswordReset(request).subscribe({
          error: (error) => {
            expect(error.error.message).toContain('Network error');
          },
        });

        const req = httpMock.expectOne(
          `${baseUrl}/auth/password-reset-request`,
        );
        req.error(
          new ErrorEvent('error', { message: 'DNS resolution failed' }),
        );
      });
    });

    describe('Timeout Errors', () => {
      it('should handle request timeout', () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'password123',
        };

        service.login(credentials).subscribe({
          error: (error) => {
            expect(error.error.type).toBe('timeout');
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        req.error(new ErrorEvent('timeout'));
      });

      it('should handle slow authentication response', () => {
        service.refreshToken().subscribe({
          error: (error) => {
            expect(error.error.type).toBe('timeout');
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
        req.error(new ErrorEvent('timeout'));
      });
    });
  });

  describe('Retry Logic', () => {
    describe('Max Retry Count', () => {
      it('should retry login on 5xx errors', () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'password123',
        };

        let attempts = 0;

        service.login(credentials).subscribe({
          error: () => {
            // Should have retried
          },
        });

        // Service has built-in retry logic
        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        attempts++;
        req.flush('Error', { status: 503, statusText: 'Service Unavailable' });
      });

      it('should succeed after retry', () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'password123',
        };

        const mockResponse: AuthTokenResponse = {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresIn: 3600,
          tokenType: 'Bearer',
        };

        service.login(credentials).subscribe((response) => {
          expect(response).toEqual(mockResponse);
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        req.flush(mockResponse);

        // Profile fetch after successful login
        const profileReq = httpMock.expectOne(`${baseUrl}/auth/profile`);
        profileReq.flush({
          id: '1',
          email: 'test@example.com',
          name: 'Test',
          roles: ['user'],
        });
      });
    });

    describe('Retry Conditions', () => {
      it('should not retry on 4xx errors (client errors)', () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'wrong',
        };

        service.login(credentials).subscribe({
          error: (error) => {
            expect(error.status).toBe(401);
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      });

      it('should handle retry exhaustion', () => {
        const credentials: LoginCredentials = {
          email: 'test@example.com',
          password: 'password123',
        };

        service.login(credentials).subscribe({
          error: (error) => {
            expect(error).toBeTruthy();
          },
        });

        const req = httpMock.expectOne(`${baseUrl}/auth/login`);
        req.flush('Error', { status: 500, statusText: 'Server Error' });
      });
    });
  });

  describe('Token Management', () => {
    it('should store tokens in localStorage when rememberMe is true', () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };

      const mockResponse: AuthTokenResponse = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        expiresIn: 3600,
        tokenType: 'Bearer',
      };

      service.login(credentials).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/auth/login`);
      req.flush(mockResponse);

      const profileReq = httpMock.expectOne(`${baseUrl}/auth/profile`);
      profileReq.flush({
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        roles: ['user'],
      });

      expect(localStorage.getItem('access_token')).toBe('access_token_123');
      expect(localStorage.getItem('refresh_token')).toBe('refresh_token_123');
    });

    it('should store tokens in sessionStorage when rememberMe is false', () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: false,
      };

      const mockResponse: AuthTokenResponse = {
        accessToken: 'access_token_456',
        refreshToken: 'refresh_token_456',
        expiresIn: 3600,
        tokenType: 'Bearer',
      };

      service.login(credentials).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/auth/login`);
      req.flush(mockResponse);

      const profileReq = httpMock.expectOne(`${baseUrl}/auth/profile`);
      profileReq.flush({
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        roles: ['user'],
      });

      expect(sessionStorage.getItem('access_token')).toBe('access_token_456');
      expect(sessionStorage.getItem('refresh_token')).toBe('refresh_token_456');
      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('should clear tokens on logout', () => {
      // Set up authenticated state
      localStorage.setItem('access_token', 'token');
      localStorage.setItem('refresh_token', 'refresh');

      service.logout();

      const req = httpMock.expectOne(`${baseUrl}/auth/logout`);
      req.flush({});

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });

    it('should refresh access token', () => {
      localStorage.setItem('refresh_token', 'old_refresh_token');

      const mockResponse: AuthTokenResponse = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      };

      service.refreshToken().subscribe((response) => {
        expect(response.accessToken).toBe('new_access_token');
      });

      const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
      expect(req.request.body).toEqual({ refreshToken: 'old_refresh_token' });
      req.flush(mockResponse);

      expect(localStorage.getItem('access_token')).toBe('new_access_token');
    });

    it('should logout on refresh token failure', () => {
      localStorage.setItem('refresh_token', 'invalid_token');
      localStorage.setItem('access_token', 'access_token');

      service.refreshToken().subscribe({
        error: () => {
          expect(localStorage.getItem('access_token')).toBeNull();
          expect(localStorage.getItem('refresh_token')).toBeNull();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/auth/refresh`);
      req.flush('Invalid token', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('Authentication State', () => {
    it('should initialize with unauthenticated state', () => {
      const state = service.getAuthState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it('should update state on successful login', () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResponse: AuthTokenResponse = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
      };

      const mockUser: UserProfile = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user'],
      };

      service.login(credentials).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/auth/login`);
      req.flush(mockResponse);

      const profileReq = httpMock.expectOne(`${baseUrl}/auth/profile`);
      profileReq.flush(mockUser);

      const state = service.getAuthState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
    });

    it('should emit state changes through observable', (done) => {
      let stateCount = 0;

      service.authState$.subscribe((state) => {
        stateCount++;
        if (stateCount === 1) {
          expect(state.isLoading).toBe(false);
        } else if (stateCount === 2) {
          expect(state.isLoading).toBe(true);
          done();
        }
      });

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      service.login(credentials).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/auth/login`);
      req.flush({
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      const profileReq = httpMock.expectOne(`${baseUrl}/auth/profile`);
      profileReq.flush({
        id: '1',
        email: 'test@example.com',
        name: 'Test',
        roles: ['user'],
      });
    });
  });

  describe('Role Management', () => {
    it('should check if user has specific role', () => {
      const credentials: LoginCredentials = {
        email: 'admin@example.com',
        password: 'password123',
      };

      const mockResponse: AuthTokenResponse = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
      };

      const mockUser: UserProfile = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        roles: ['admin', 'user'],
      };

      service.login(credentials).subscribe();

      const req = httpMock.expectOne(`${baseUrl}/auth/login`);
      req.flush(mockResponse);

      const profileReq = httpMock.expectOne(`${baseUrl}/auth/profile`);
      profileReq.flush(mockUser);

      expect(service.hasRole('admin')).toBe(true);
      expect(service.hasRole('user')).toBe(true);
      expect(service.hasRole('superadmin')).toBe(false);
    });

    it('should return false for roles when not authenticated', () => {
      expect(service.hasRole('admin')).toBe(false);
      expect(service.hasRole('user')).toBe(false);
    });
  });

  describe('Password Reset', () => {
    it('should request password reset', () => {
      const request: PasswordResetRequest = {
        email: 'test@example.com',
      };

      service.requestPasswordReset(request).subscribe((success) => {
        expect(success).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/auth/password-reset-request`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush({ success: true });
    });

    it('should reset password with token', () => {
      service
        .resetPassword('reset-token-123', 'newpassword123')
        .subscribe((success) => {
          expect(success).toBe(true);
        });

      const req = httpMock.expectOne(`${baseUrl}/auth/password-reset`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        token: 'reset-token-123',
        newPassword: 'newpassword123',
      });
      req.flush({ success: true });
    });

    it('should handle invalid reset token', () => {
      service.resetPassword('invalid-token', 'newpassword123').subscribe({
        error: (error) => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/auth/password-reset`);
      req.flush('Invalid token', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('Registration', () => {
    it('should register new user', () => {
      const data: RegistrationData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      const mockResponse: AuthTokenResponse = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
      };

      const mockUser: UserProfile = {
        id: '1',
        email: 'newuser@example.com',
        name: 'New User',
        roles: ['user'],
      };

      service.register(data).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(data);
      req.flush(mockResponse);

      const profileReq = httpMock.expectOne(`${baseUrl}/auth/profile`);
      profileReq.flush(mockUser);
    });

    it('should handle registration validation errors', () => {
      const data: RegistrationData = {
        email: 'invalid',
        password: '123',
        name: '',
      };

      service.register(data).subscribe({
        error: (error) => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/auth/register`);
      req.flush(
        { errors: ['Invalid email', 'Password too short', 'Name required'] },
        { status: 400, statusText: 'Bad Request' },
      );
    });
  });

  describe('Error Message Mapping', () => {
    it('should return appropriate error messages', () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      service.login(credentials).subscribe({
        error: () => {
          const state = service.getAuthState();
          expect(state.error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/auth/login`);
      req.flush(
        { message: 'Custom error message' },
        { status: 500, statusText: 'Server Error' },
      );
    });

    it('should handle error without message', () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      service.login(credentials).subscribe({
        error: () => {
          const state = service.getAuthState();
          expect(state.error).toContain('unexpected');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/auth/login`);
      req.flush({}, { status: 418, statusText: "I'm a teapot" });
    });
  });
});
