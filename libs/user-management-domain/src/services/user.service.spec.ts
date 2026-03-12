import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UserService, UserRepository } from './user.service';
import { User } from '../entities/user.entity';
import { UserRole, UserStatus, CreateUserDto, UpdateUserDto } from '../index';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hash',
    firstName: 'John',
    lastName: 'Doe',
    organizationId: 'org-1',
    role: UserRole.USER,
    status: UserStatus.PENDING,
    isActive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    username: undefined,
    lastLoginAt: undefined,
    getFullName: jest.fn().mockReturnValue('John Doe'),
    activate: jest.fn(),
    deactivate: jest.fn(),
    suspend: jest.fn(),
    canTransitionTo: jest.fn(),
    updateProfile: jest.fn(),
    recordLogin: jest.fn(),
  } as unknown as User;

  const mockUserRepository: jest.Mocked<UserRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
    findByStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: 'UserRepository', useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = mockUserRepository;

    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const createDto: CreateUserDto = {
      email: 'new@example.com',
      password: 'Password123',
      firstName: 'Jane',
      lastName: 'Smith',
      organizationId: 'org-1',
      role: UserRole.USER,
    };

    it('should create user with valid data', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockImplementation((user) =>
        Promise.resolve(user as User),
      );

      const result = await service.createUser(createDto);

      expect(result.email).toBe(createDto.email);
      expect(result.firstName).toBe(createDto.firstName);
      expect(result.lastName).toBe(createDto.lastName);
      expect(repository.create).toHaveBeenCalled();
    });

    it('should throw error for duplicate email', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.createUser(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash password before saving', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockImplementation((user) =>
        Promise.resolve(user as User),
      );

      await service.createUser(createDto);

      const createdUser = repository.create.mock.calls[0][0];
      expect(createdUser.passwordHash).not.toBe(createDto.password);
      expect(createdUser.passwordHash).toHaveLength(64);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto: CreateUserDto = {
        email: 'invalid-email',
        password: 'short',
      };

      await expect(service.createUser(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set default role to USER', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockImplementation((user) =>
        Promise.resolve(user as User),
      );

      const dtoWithoutRole = { ...createDto, role: undefined };
      await service.createUser(dtoWithoutRole);

      const createdUser = repository.create.mock.calls[0][0];
      expect(createdUser.role).toBe(UserRole.USER);
    });

    it('should set default status to PENDING', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.create.mockImplementation((user) =>
        Promise.resolve(user as User),
      );

      const dtoWithoutStatus = { ...createDto, status: undefined };
      await service.createUser(dtoWithoutStatus);

      const createdUser = repository.create.mock.calls[0][0];
      expect(createdUser.status).toBe(UserStatus.PENDING);
      expect(createdUser.isActive).toBe(false);
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      repository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      repository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null for non-existent email', async () => {
      repository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const users = [
        mockUser,
        { ...mockUser, id: 'user-2', email: 'test2@example.com' },
      ];
      repository.findAll.mockResolvedValue(users as User[]);
      repository.count.mockResolvedValue(2);

      const result = await service.findAll({ skip: 0, take: 10 });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by organizationId', async () => {
      repository.findAll.mockResolvedValue([mockUser]);
      repository.count.mockResolvedValue(1);

      await service.findAll({ organizationId: 'org-1' });

      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
        }),
      );
    });
  });

  describe('updateUser', () => {
    const updateDto: UpdateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user with valid data', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockImplementation((id, updates) =>
        Promise.resolve({ ...mockUser, ...updates } as User),
      );

      const result = await service.updateUser('user-1', updateDto);

      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateUser('non-existent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate email', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.findByEmail.mockResolvedValue({
        ...mockUser,
        id: 'user-2',
      } as User);

      await expect(
        service.updateUser('user-1', { email: 'existing@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate status transitions', async () => {
      repository.findById.mockResolvedValue(mockUser);

      mockUser.canTransitionTo = jest.fn().mockReturnValue(false);

      await expect(
        service.updateUser('user-1', { status: UserStatus.INACTIVE }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteUser', () => {
    it('should delete existing user', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.delete.mockResolvedValue(true);

      await service.deleteUser('user-1');

      expect(repository.delete).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deleteUser('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      repository.search.mockResolvedValue([mockUser]);

      const result = await service.searchUsers('john');

      expect(result).toHaveLength(1);
      expect(repository.search).toHaveBeenCalledWith('john', undefined);
    });

    it('should search within organization', async () => {
      repository.search.mockResolvedValue([mockUser]);

      await service.searchUsers('john', 'org-1');

      expect(repository.search).toHaveBeenCalledWith('john', 'org-1');
    });
  });

  describe('filterByStatus', () => {
    it('should filter users by status', async () => {
      repository.findByStatus.mockResolvedValue([mockUser]);

      const result = await service.filterByStatus(UserStatus.ACTIVE);

      expect(result).toHaveLength(1);
      expect(repository.findByStatus).toHaveBeenCalledWith(
        UserStatus.ACTIVE,
        undefined,
      );
    });
  });

  describe('activateUser', () => {
    it('should activate user', async () => {
      const pendingUser = { ...mockUser, status: UserStatus.PENDING };
      repository.findById.mockResolvedValue(pendingUser as User);
      repository.update.mockImplementation(
        ((id, updates) = Promise.resolve({
          ...pendingUser,
          ...updates,
        } as User)),
      );

      const result = await service.activateUser('user-1');

      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(result.isActive).toBe(true);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      const activeUser = {
        ...mockUser,
        status: UserStatus.ACTIVE,
        isActive: true,
      };
      repository.findById.mockResolvedValue(activeUser as User);
      repository.update.mockImplementation(
        ((id, updates) = Promise.resolve({
          ...activeUser,
          ...updates,
        } as User)),
      );

      const result = await service.deactivateUser('user-1');

      expect(result.status).toBe(UserStatus.INACTIVE);
      expect(result.isActive).toBe(false);
    });
  });

  describe('suspendUser', () => {
    it('should suspend user', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockImplementation(
        ((id, updates) = Promise.resolve({ ...mockUser, ...updates } as User)),
      );

      const result = await service.suspendUser('user-1');

      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(result.isActive).toBe(false);
    });
  });

  describe('bulkActivate', () => {
    it('should activate multiple users', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.update.mockImplementation(
        ((id, updates) = Promise.resolve({ ...mockUser, ...updates } as User)),
      );

      const result = await service.bulkActivate(['user-1', 'user-2']);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      repository.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      const result = await service.bulkActivate(['user-1', 'user-2']);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('bulkDeactivate', () => {
    it('should deactivate multiple users', async () => {
      const activeUser = {
        ...mockUser,
        status: UserStatus.ACTIVE,
        isActive: true,
      };
      repository.findById.mockResolvedValue(activeUser as User);
      repository.update.mockImplementation(
        ((id, updates) = Promise.resolve({
          ...activeUser,
          ...updates,
        } as User)),
      );

      const result = await service.bulkDeactivate(['user-1', 'user-2']);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple users', async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.delete.mockResolvedValue(true);

      const result = await service.bulkDelete(['user-1', 'user-2']);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle partial failures in bulk delete', async () => {
      repository.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      const result = await service.bulkDelete(['user-1', 'user-2']);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
