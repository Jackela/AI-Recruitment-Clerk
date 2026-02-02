import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { testUsers, makeToken } from './test-users.store';

/**
 * Exposes endpoints for test auth.
 */
@Controller()
export class TestAuthController {
  /**
   * Performs the register operation.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @Post('auth/register')
  @HttpCode(HttpStatus.CREATED)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public register(@Body() body: any): { success: boolean; data: { organizationId: string; userId: string; accessToken: string } } {
    const orgId =
      body.organizationId || 'org-' + Math.random().toString(36).slice(2, 8);
    const userId = 'user-' + Math.random().toString(36).slice(2, 8);
    const now = new Date().toISOString();

    testUsers.set(String(body.email), {
      userId,
      email: String(body.email),
      name: String(body.name || ''),
      role: String(body.role || 'user'),
      organizationId: orgId,
      createdAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      data: {
        organizationId: orgId,
        userId,
        accessToken: makeToken(String(body.email || 'user@test')),
      },
    };
  }

  /**
   * Performs the login operation.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public login(@Body() body: any): { success: boolean; data: { accessToken: string } } {
    const token = makeToken(String(body.email || 'user@test'));
    return {
      success: true,
      data: {
        accessToken: token,
      },
    };
  }

  // Convenience test endpoint to decode current user
  /**
   * Retrieves test profile.
   * @param auth - The auth.
   * @returns The result of the operation.
   */
  @Get('auth/test-profile')
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getTestProfile(@Headers('authorization') auth?: string): { success: boolean; data?: any; error?: string } {
    const token = auth?.split(' ')[1] || '';
    if (!token.startsWith('test-token-')) {
      return { success: false, error: 'Invalid test token' };
    }
    const email = Buffer.from(
      token.replace('test-token-', ''),
      'base64',
    ).toString();
    const user = testUsers.get(email);
    return {
      success: true,
      data: user || { email },
    };
  }
}
