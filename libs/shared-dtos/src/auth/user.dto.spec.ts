import {
  UserRole,
  UserStatus,
  CreateUserDto,
  LoginDto,
  UserDto,
  JwtPayload,
  AuthResponseDto,
  RefreshTokenDto,
  UpdateUserDto,
  UserPreferencesDto,
  UserActivityDto,
} from './user.dto';

describe('UserDto', () => {
  describe('UserRole enum', () => {
    it('should have correct role values', () => {
      expect(UserRole.ADMIN).toBe('admin');
      expect(UserRole.HR_MANAGER).toBe('hr_manager');
      expect(UserRole.RECRUITER).toBe('recruiter');
      expect(UserRole.VIEWER).toBe('viewer');
    });
  });

  describe('UserStatus enum', () => {
    it('should have correct status values', () => {
      expect(UserStatus.ACTIVE).toBe('active');
      expect(UserStatus.INACTIVE).toBe('inactive');
      expect(UserStatus.SUSPENDED).toBe('suspended');
    });
  });

  describe('CreateUserDto', () => {
    it('should accept valid user data', () => {
      const dto = new CreateUserDto();
      dto.email = 'test@example.com';
      dto.password = 'password123';
      dto.firstName = 'John';
      dto.lastName = 'Doe';
      dto.role = UserRole.RECRUITER;
      dto.organizationId = 'org-123';

      expect(dto.email).toBe('test@example.com');
      expect(dto.password).toBe('password123');
      expect(dto.role).toBe(UserRole.RECRUITER);
    });

    it('should allow optional username', () => {
      const dto = new CreateUserDto();
      dto.email = 'test@example.com';
      dto.password = 'password123';
      dto.firstName = 'John';
      dto.lastName = 'Doe';
      dto.role = UserRole.VIEWER;
      dto.username = 'johndoe';

      expect(dto.username).toBe('johndoe');
    });

    it('should have default status', () => {
      const dto = new CreateUserDto();
      dto.email = 'test@example.com';
      dto.password = 'password123';
      dto.firstName = 'John';
      dto.lastName = 'Doe';
      dto.role = UserRole.VIEWER;

      expect(dto.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('LoginDto', () => {
    it('should accept login credentials', () => {
      const dto = new LoginDto();
      dto.email = 'user@example.com';
      dto.password = 'secret123';

      expect(dto.email).toBe('user@example.com');
      expect(dto.password).toBe('secret123');
    });
  });

  describe('UserDto', () => {
    it('should compute full name', () => {
      const dto = new UserDto();
      dto.firstName = 'Jane';
      dto.lastName = 'Smith';
      dto.id = 'user-123';
      dto.email = 'jane@example.com';
      dto.role = UserRole.ADMIN;
      dto.status = UserStatus.ACTIVE;
      dto.createdAt = new Date();
      dto.updatedAt = new Date();

      expect(dto.name).toBe('Jane Smith');
    });

    it('should allow optional organizationId', () => {
      const dto = new UserDto();
      dto.id = 'user-1';
      dto.email = 'test@test.com';
      dto.firstName = 'Test';
      dto.lastName = 'User';
      dto.role = UserRole.VIEWER;
      dto.status = UserStatus.ACTIVE;
      dto.createdAt = new Date();
      dto.updatedAt = new Date();

      expect(dto.organizationId).toBeUndefined();
    });
  });

  describe('JwtPayload', () => {
    it('should accept valid JWT payload', () => {
      const payload = new JwtPayload();
      payload.sub = 'user-123';
      payload.email = 'test@example.com';
      payload.role = UserRole.RECRUITER;
      payload.organizationId = 'org-456';
      payload.iat = Math.floor(Date.now() / 1000);
      payload.exp = Math.floor(Date.now() / 1000) + 3600;

      expect(payload.sub).toBe('user-123');
      expect(payload.role).toBe(UserRole.RECRUITER);
    });

    it('should allow optional audience and issuer', () => {
      const payload = new JwtPayload();
      payload.sub = 'user-1';
      payload.email = 'test@test.com';
      payload.role = UserRole.VIEWER;
      payload.aud = 'app-gateway';
      payload.iss = 'auth-service';

      expect(payload.aud).toBe('app-gateway');
      expect(payload.iss).toBe('auth-service');
    });
  });

  describe('AuthResponseDto', () => {
    it('should accept valid auth response', () => {
      const dto = new AuthResponseDto();
      dto.accessToken = 'eyJhbGc...';
      dto.refreshToken = 'refresh_token';
      dto.user = new UserDto();
      dto.user.id = 'user-1';
      dto.user.email = 'test@test.com';
      dto.user.firstName = 'Test';
      dto.user.lastName = 'User';
      dto.user.role = UserRole.VIEWER;
      dto.user.status = UserStatus.ACTIVE;
      dto.user.createdAt = new Date();
      dto.user.updatedAt = new Date();
      dto.expiresIn = 3600;

      expect(dto.accessToken).toBe('eyJhbGc...');
      expect(dto.expiresIn).toBe(3600);
    });
  });

  describe('RefreshTokenDto', () => {
    it('should accept refresh token', () => {
      const dto = new RefreshTokenDto();
      dto.refreshToken = 'refresh_token_value';

      expect(dto.refreshToken).toBe('refresh_token_value');
    });
  });

  describe('UpdateUserDto', () => {
    it('should allow partial updates', () => {
      const dto = new UpdateUserDto();
      dto.firstName = 'Updated';
      dto.email = 'newemail@example.com';

      expect(dto.firstName).toBe('Updated');
      expect(dto.email).toBe('newemail@example.com');
      expect(dto.lastName).toBeUndefined();
      expect(dto.role).toBeUndefined();
    });

    it('should allow role update', () => {
      const dto = new UpdateUserDto();
      dto.role = UserRole.ADMIN;

      expect(dto.role).toBe(UserRole.ADMIN);
    });

    it('should allow status update', () => {
      const dto = new UpdateUserDto();
      dto.status = UserStatus.SUSPENDED;

      expect(dto.status).toBe(UserStatus.SUSPENDED);
    });
  });

  describe('UserPreferencesDto', () => {
    it('should accept preferences', () => {
      const dto = new UserPreferencesDto();
      dto.language = 'en-US';
      dto.timezone = 'America/New_York';
      dto.theme = 'dark';
      dto.notifications = {
        email: true,
        browser: false,
        mobile: true,
      };

      expect(dto.language).toBe('en-US');
      expect(dto.notifications?.email).toBe(true);
      expect(dto.notifications?.browser).toBe(false);
    });

    it('should allow partial notifications', () => {
      const dto = new UserPreferencesDto();
      dto.notifications = { email: true };

      expect(dto.notifications?.email).toBe(true);
      expect(dto.notifications?.browser).toBeUndefined();
    });
  });

  describe('UserActivityDto', () => {
    it('should accept activity data', () => {
      const dto = new UserActivityDto();
      dto.id = 'activity-1';
      dto.userId = 'user-123';
      dto.action = 'LOGIN';
      dto.resource = '/api/dashboard';
      dto.metadata = { ip: '192.168.1.1' };
      dto.ipAddress = '192.168.1.1';
      dto.userAgent = 'Mozilla/5.0';
      dto.timestamp = new Date();

      expect(dto.action).toBe('LOGIN');
      expect(dto.metadata?.ip).toBe('192.168.1.1');
    });

    it('should allow optional fields', () => {
      const dto = new UserActivityDto();
      dto.id = 'activity-1';
      dto.userId = 'user-123';
      dto.action = 'LOGOUT';
      dto.timestamp = new Date();

      expect(dto.resource).toBeUndefined();
      expect(dto.ipAddress).toBeUndefined();
    });
  });
});
