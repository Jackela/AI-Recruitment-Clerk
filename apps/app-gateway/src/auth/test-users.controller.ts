import { Controller, Get, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { testUsers, decodeEmailFromToken } from './test-users.store';

/**
 * Exposes endpoints for test users.
 */
@Controller()
export class TestUsersController {
  /**
   * Retrieves profile.
   * @param auth - The auth.
   * @returns The result of the operation.
   */
  @Public()
  @Get('users/profile')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getProfile(@Headers('authorization') auth?: string): { success: boolean; data: any } {
    const email = decodeEmailFromToken(auth);
    const user = email ? testUsers.get(email) : null;
    return {
      success: true,
      data: user || {},
    };
  }

  /**
   * Retrieves activity.
   * @returns The result of the operation.
   */
  @Public()
  @Get('users/activity')
  @HttpCode(HttpStatus.OK)
  public getActivity(): { success: boolean; data: { active: boolean; timestamp: string } } {
    return {
      success: true,
      data: { active: true, timestamp: new Date().toISOString() },
    };
  }

  /**
   * Performs the list org users operation.
   * @param auth - The auth.
   * @returns The result of the operation.
   */
  @Public()
  @Get('users/organization/users')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public listOrgUsers(@Headers('authorization') auth?: string): { success: boolean; data: { users: any[] } } {
    const email = decodeEmailFromToken(auth);
    const admin = email ? testUsers.get(email) : null;
    const orgId = admin?.organizationId;
    const users = Array.from(testUsers.values()).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (u: any) => !orgId || u.organizationId === orgId,
    );
    return {
      success: true,
      data: { users },
    };
  }
}
