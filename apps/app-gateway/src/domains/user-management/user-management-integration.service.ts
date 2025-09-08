import { Injectable } from '@nestjs/common';

@Injectable()
export class UserManagementIntegrationService {
  // 简化实现，主要作为占位符
  async getUserProfile(userId: string) {
    return {
      userId,
      isActive: true,
    };
  }
}
