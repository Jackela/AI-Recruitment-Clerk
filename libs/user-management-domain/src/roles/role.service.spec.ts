import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  RoleService,
  Role,
  RoleAssignment,
  RoleRepository,
  RoleAssignmentRepository,
} from './role.service';
import { UserRole } from '../index';

describe('RoleService', () => {
  let service: RoleService;
  let roleRepository: jest.Mocked<RoleRepository>;
  let assignmentRepository: jest.Mocked<RoleAssignmentRepository>;

  const mockRole: Role = {
    id: 'role-1',
    name: 'Test Role',
    key: UserRole.USER,
    description: 'Test role description',
    isDefault: false,
    permissions: ['read:user'],
    hierarchyLevel: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdminRole: Role = {
    id: 'role-admin',
    name: 'Administrator',
    key: UserRole.ADMIN,
    description: 'Admin role',
    isDefault: true,
    permissions: ['*'],
    hierarchyLevel: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRoleRepository: jest.Mocked<RoleRepository> = {
    findById: jest.fn(),
    findByKey: jest.fn(),
    findAll: jest.fn(),
    findDefault: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockAssignmentRepository: jest.Mocked<RoleAssignmentRepository> = {
    findByUserId: jest.fn(),
    findByRoleId: jest.fn(),
    assignRole: jest.fn(),
    removeRole: jest.fn(),
    removeAllUserRoles: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: 'RoleRepository', useValue: mockRoleRepository },
        {
          provide: 'RoleAssignmentRepository',
          useValue: mockAssignmentRepository,
        },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
    roleRepository = mockRoleRepository;
    assignmentRepository = mockAssignmentRepository;

    jest.clearAllMocks();
  });

  describe('createRole', () => {
    const createData = {
      name: 'New Role',
      key: UserRole.RECRUITER,
      description: 'New role description',
      permissions: ['read:users', 'create:jobs'],
      hierarchyLevel: 50,
    };

    it('should create role with valid data', async () => {
      roleRepository.findByKey.mockResolvedValue(null);
      roleRepository.create.mockImplementation((role) => Promise.resolve(role));

      const result = await service.createRole(createData);

      expect(result.name).toBe(createData.name);
      expect(result.key).toBe(createData.key);
      expect(result.permissions).toEqual(createData.permissions);
      expect(result.hierarchyLevel).toBe(createData.hierarchyLevel);
      expect(result.isDefault).toBe(false);
    });

    it('should throw ConflictException for duplicate key', async () => {
      roleRepository.findByKey.mockResolvedValue(mockRole);

      await expect(service.createRole(createData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should use default hierarchy level when not provided', async () => {
      roleRepository.findByKey.mockResolvedValue(null);
      roleRepository.create.mockImplementation((role) => Promise.resolve(role));

      const dataWithoutLevel = { ...createData, hierarchyLevel: undefined };
      const result = await service.createRole(dataWithoutLevel);

      expect(result.hierarchyLevel).toBe(0);
    });
  });

  describe('findById', () => {
    it('should return role by id', async () => {
      roleRepository.findById.mockResolvedValue(mockRole);

      const result = await service.findById('role-1');

      expect(result.id).toBe('role-1');
      expect(result.name).toBe('Test Role');
    });

    it('should throw NotFoundException for non-existent role', async () => {
      roleRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByKey', () => {
    it('should return role by key', async () => {
      roleRepository.findByKey.mockResolvedValue(mockRole);

      const result = await service.findByKey(UserRole.USER);

      expect(result.key).toBe(UserRole.USER);
    });

    it('should throw NotFoundException for non-existent key', async () => {
      roleRepository.findByKey.mockResolvedValue(null);

      await expect(service.findByKey(UserRole.USER)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      const roles = [mockRole, mockAdminRole];
      roleRepository.findAll.mockResolvedValue(roles);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('role-1');
    });

    it('should return empty array when no roles', async () => {
      roleRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('updateRole', () => {
    it('should update role with valid data', async () => {
      roleRepository.findById.mockResolvedValue(mockRole);
      roleRepository.update.mockImplementation((id, updates) =>
        Promise.resolve({ ...mockRole, ...updates } as Role),
      );

      const result = await service.updateRole('role-1', {
        name: 'Updated Role',
      });

      expect(result.name).toBe('Updated Role');
    });

    it('should throw NotFoundException for non-existent role', async () => {
      roleRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateRole('non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent changing key of default role', async () => {
      roleRepository.findById.mockResolvedValue(mockAdminRole);

      await expect(
        service.updateRole('role-admin', { key: UserRole.USER }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update timestamp', async () => {
      roleRepository.findById.mockResolvedValue(mockRole);
      roleRepository.update.mockImplementation((id, updates) =>
        Promise.resolve({ ...mockRole, ...updates } as Role),
      );

      const before = new Date();
      const result = await service.updateRole('role-1', { name: 'Updated' });
      const after = new Date();

      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(result.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('deleteRole', () => {
    it('should delete existing role', async () => {
      roleRepository.findById.mockResolvedValue(mockRole);
      roleRepository.delete.mockResolvedValue(true);

      await service.deleteRole('role-1');

      expect(roleRepository.delete).toHaveBeenCalledWith('role-1');
    });

    it('should throw NotFoundException for non-existent role', async () => {
      roleRepository.findById.mockResolvedValue(null);

      await expect(service.deleteRole('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent deleting default role', async () => {
      roleRepository.findById.mockResolvedValue(mockAdminRole);

      await expect(service.deleteRole('role-admin')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      roleRepository.findById.mockResolvedValue(mockRole);
      assignmentRepository.assignRole.mockImplementation((assignment) =>
        Promise.resolve(assignment),
      );

      const result = await service.assignRole('user-1', 'role-1', 'admin-1');

      expect(result.userId).toBe('user-1');
      expect(result.roleId).toBe('role-1');
      expect(result.assignedBy).toBe('admin-1');
    });

    it('should throw NotFoundException for non-existent role', async () => {
      roleRepository.findById.mockResolvedValue(null);

      await expect(
        service.assignRole('user-1', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeRole', () => {
    it('should remove role from user', async () => {
      assignmentRepository.removeRole.mockResolvedValue(true);

      await service.removeRole('user-1', 'role-1');

      expect(assignmentRepository.removeRole).toHaveBeenCalledWith(
        'user-1',
        'role-1',
      );
    });

    it('should throw NotFoundException for non-existent assignment', async () => {
      assignmentRepository.removeRole.mockResolvedValue(false);

      await expect(service.removeRole('user-1', 'role-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserRoles', () => {
    it('should return roles for user', async () => {
      const assignments: RoleAssignment[] = [
        { userId: 'user-1', roleId: 'role-1', assignedAt: new Date() },
        { userId: 'user-1', roleId: 'role-2', assignedAt: new Date() },
      ];
      assignmentRepository.findByUserId.mockResolvedValue(assignments);
      roleRepository.findById
        .mockResolvedValueOnce(mockRole)
        .mockResolvedValueOnce({ ...mockRole, id: 'role-2', name: 'Role 2' });

      const result = await service.getUserRoles('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('role-1');
    });

    it('should handle missing roles gracefully', async () => {
      assignmentRepository.findByUserId.mockResolvedValue([
        { userId: 'user-1', roleId: 'deleted-role', assignedAt: new Date() },
      ]);
      roleRepository.findById.mockResolvedValue(null);

      const result = await service.getUserRoles('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getUsersWithRole', () => {
    it('should return user IDs with role', async () => {
      const assignments: RoleAssignment[] = [
        { userId: 'user-1', roleId: 'role-1', assignedAt: new Date() },
        { userId: 'user-2', roleId: 'role-1', assignedAt: new Date() },
      ];
      assignmentRepository.findByRoleId.mockResolvedValue(assignments);

      const result = await service.getUsersWithRole('role-1');

      expect(result).toEqual(['user-1', 'user-2']);
    });

    it('should return empty array when no users have role', async () => {
      assignmentRepository.findByRoleId.mockResolvedValue([]);

      const result = await service.getUsersWithRole('role-1');

      expect(result).toEqual([]);
    });
  });

  describe('setDefaultRole', () => {
    it('should set role as default', async () => {
      roleRepository.findById.mockResolvedValue(mockRole);
      roleRepository.update.mockImplementation((id, updates) =>
        Promise.resolve({ ...mockRole, ...updates } as Role),
      );

      const result = await service.setDefaultRole('role-1');

      expect(result.isDefault).toBe(true);
    });

    it('should throw NotFoundException for non-existent role', async () => {
      roleRepository.findById.mockResolvedValue(null);

      await expect(service.setDefaultRole('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDefaultRole', () => {
    it('should return default role', async () => {
      roleRepository.findDefault.mockResolvedValue(mockAdminRole);

      const result = await service.getDefaultRole();

      expect(result).not.toBeNull();
      expect(result?.isDefault).toBe(true);
    });

    it('should return null when no default role', async () => {
      roleRepository.findDefault.mockResolvedValue(null);

      const result = await service.getDefaultRole();

      expect(result).toBeNull();
    });
  });

  describe('hasHigherHierarchy', () => {
    it('should return true for higher hierarchy', () => {
      const result = service.hasHigherHierarchy(mockAdminRole, mockRole);

      expect(result).toBe(true);
    });

    it('should return false for lower hierarchy', () => {
      const result = service.hasHigherHierarchy(mockRole, mockAdminRole);

      expect(result).toBe(false);
    });

    it('should return false for same hierarchy', () => {
      const sameLevelRole = { ...mockRole, id: 'role-2' };
      const result = service.hasHigherHierarchy(mockRole, sameLevelRole);

      expect(result).toBe(false);
    });
  });

  describe('canManageRole', () => {
    it('should allow managing lower hierarchy role', () => {
      const result = service.canManageRole(mockAdminRole, mockRole);

      expect(result).toBe(true);
    });

    it('should deny managing higher hierarchy role', () => {
      const result = service.canManageRole(mockRole, mockAdminRole);

      expect(result).toBe(false);
    });

    it('should deny managing same hierarchy role', () => {
      const sameLevelRole = { ...mockRole, id: 'role-2' };
      const result = service.canManageRole(mockRole, sameLevelRole);

      expect(result).toBe(false);
    });
  });

  describe('getRoleHierarchy', () => {
    it('should return roles sorted by hierarchy', async () => {
      const roles = [
        { ...mockRole, hierarchyLevel: 10 },
        { ...mockAdminRole, hierarchyLevel: 100 },
        { ...mockRole, id: 'role-2', hierarchyLevel: 50 },
      ];
      roleRepository.findAll.mockResolvedValue(roles);

      const result = await service.getRoleHierarchy();

      expect(result[0].hierarchyLevel).toBe(100);
      expect(result[1].hierarchyLevel).toBe(50);
      expect(result[2].hierarchyLevel).toBe(10);
    });
  });

  describe('initializeDefaultRoles', () => {
    it('should create default roles when not exist', async () => {
      roleRepository.findByKey.mockResolvedValue(null);
      roleRepository.create.mockImplementation((role) => Promise.resolve(role));

      await service.initializeDefaultRoles();

      expect(roleRepository.create).toHaveBeenCalledTimes(4);
    });

    it('should skip existing roles', async () => {
      roleRepository.findByKey.mockResolvedValue(mockRole);

      await service.initializeDefaultRoles();

      expect(roleRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('clearUserRoles', () => {
    it('should clear all roles from user', async () => {
      await service.clearUserRoles('user-1');

      expect(assignmentRepository.removeAllUserRoles).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });
});
