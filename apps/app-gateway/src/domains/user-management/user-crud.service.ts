import { Injectable, NotFoundException } from '@nestjs/common';
import type { UserService } from '../../auth/user.service';
import type {
  UserDto,
  UpdateUserDto,
} from '@ai-recruitment-clerk/user-management-domain';
import {
  UserStatus,
} from '@ai-recruitment-clerk/user-management-domain';

/**
 * User CRUD Service.
 * Handles basic Create, Read, Update, Delete (CRUD) operations for users.
 * This service extracts core CRUD functionality from UserManagementService
 * for better separation of concerns and reusability.
 *
 * @example
 * ```typescript
 * constructor(private readonly userCrudService: UserCrudService) {}
 *
 * async getUser(id: string) {
 *   return this.userCrudService.findById(id);
 * }
 * ```
 */
@Injectable()
export class UserCrudService {
  /**
   * Initializes a new instance of the User CRUD Service.
   * @param userService - The user service (data access layer).
   */
  constructor(private readonly userService: UserService) {}

  /**
   * Finds a user by ID.
   * @param userId - The user ID to find.
   * @returns A promise that resolves to the user DTO or null if not found.
   */
  public async findById(userId: string): Promise<UserDto | null> {
    return this.userService.findById(userId);
  }

  /**
   * Finds a user by email.
   * @param email - The email to search for.
   * @returns A promise that resolves to the user DTO or null if not found.
   */
  public async findByEmail(email: string): Promise<UserDto | null> {
    return this.userService.findByEmail(email);
  }

  /**
   * Updates an existing user.
   * @param userId - The user ID to update.
   * @param updateData - The data to update.
   * @returns A promise that resolves to the updated user DTO.
   * @throws NotFoundException if the user is not found.
   */
  public async update(
    userId: string,
    updateData: UpdateUserDto,
  ): Promise<UserDto> {
    const updatedUser = await this.userService.updateUser(userId, updateData);
    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return updatedUser;
  }

  /**
   * Deletes a user permanently.
   * @param userId - The user ID to delete.
   * @returns A promise that resolves when the operation completes.
   */
  public async delete(userId: string): Promise<void> {
    await this.userService.deleteUser(userId);
  }

  /**
   * Soft deletes a user by setting their status to INACTIVE.
   * @param userId - The user ID to soft delete.
   * @param reason - Optional reason for the soft delete.
   * @returns A promise that resolves to the updated user DTO.
   * @throws NotFoundException if the user is not found.
   */
  public async softDelete(
    userId: string,
    reason?: string,
  ): Promise<UserDto> {
    const updatedUser = await this.userService.updateUser(userId, {
      status: UserStatus.INACTIVE,
      updatedAt: new Date(),
    });

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Log reason if provided (in production, this would go to an audit log)
    if (reason) {
      // TODO: Log soft delete reason to audit service
      void reason;
    }

    return updatedUser;
  }

  /**
   * Updates a user's status.
   * @param userId - The user ID to update.
   * @param status - The new status.
   * @param reason - Optional reason for the status change.
   * @returns A promise that resolves to the updated user DTO.
   * @throws NotFoundException if the user is not found.
   */
  public async updateStatus(
    userId: string,
    status: UserStatus,
    reason?: string,
  ): Promise<UserDto> {
    const updatedUser = await this.userService.updateUser(userId, {
      status,
      updatedAt: new Date(),
    });

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Log reason if provided (in production, this would go to an audit log)
    if (reason) {
      // TODO: Log status change reason to audit service
      void reason;
    }

    return updatedUser;
  }

  /**
   * Lists users by organization.
   * @param organizationId - The organization ID to filter by.
   * @returns A promise that resolves to an array of user DTOs.
   */
  public async listByOrganization(organizationId: string): Promise<UserDto[]> {
    return this.userService.findByOrganizationId(organizationId);
  }

  /**
   * Lists all users with optional filters.
   * @param options - Optional filters and pagination options.
   * @returns A promise that resolves to an array of user DTOs.
   */
  public async list(options?: {
    organizationId?: string;
    status?: UserStatus;
  }): Promise<UserDto[]> {
    let users = await this.userService.listUsers(options?.organizationId);

    if (options?.status) {
      users = users.filter((user) => user.status === options.status);
    }

    return users;
  }

  /**
   * Checks if a user exists by ID.
   * @param userId - The user ID to check.
   * @returns A promise that resolves to true if the user exists, false otherwise.
   */
  public async exists(userId: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    return user !== null;
  }

  /**
   * Checks if a user exists by email.
   * @param email - The email to check.
   * @returns A promise that resolves to true if the user exists, false otherwise.
   */
  public async existsByEmail(email: string): Promise<boolean> {
    const user = await this.userService.findByEmail(email);
    return user !== null;
  }
}
