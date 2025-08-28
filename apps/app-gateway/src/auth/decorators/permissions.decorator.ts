import { SetMetadata } from '@nestjs/common';
import { Permission } from '@app/shared-dtos';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);