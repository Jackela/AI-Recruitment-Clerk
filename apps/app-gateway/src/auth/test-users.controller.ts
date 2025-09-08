import { Controller, Get, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { testUsers, decodeEmailFromToken } from './test-users.store';

@Controller()
export class TestUsersController {
  @Public()
  @Get('users/profile')
  @HttpCode(HttpStatus.OK)
  getProfile(@Headers('authorization') auth?: string) {
    const email = decodeEmailFromToken(auth);
    const user = email ? testUsers.get(email) : null;
    return {
      success: true,
      data: user || {},
    };
  }

  @Public()
  @Get('users/activity')
  @HttpCode(HttpStatus.OK)
  getActivity() {
    return {
      success: true,
      data: { active: true, timestamp: new Date().toISOString() },
    };
  }

  @Public()
  @Get('users/organization/users')
  @HttpCode(HttpStatus.OK)
  listOrgUsers(@Headers('authorization') auth?: string) {
    const email = decodeEmailFromToken(auth);
    const admin = email ? testUsers.get(email) : null;
    const orgId = admin?.organizationId;
    const users = Array.from(testUsers.values()).filter(
      (u: any) => !orgId || u.organizationId === orgId,
    );
    return {
      success: true,
      data: { users },
    };
  }
}
