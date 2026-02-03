import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { OpsGuard } from './ops.guard';
import { OpsPermissionsGuard } from './ops-permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '@ai-recruitment-clerk/user-management-domain';

interface DeployResponse {
  deploymentId: string;
  status: string;
  channel: 'pre-release' | 'production';
  artifactId: string;
}

interface RollbackResponse {
  status: string;
}

@Controller('ops/release')
@UseGuards(OpsGuard, OpsPermissionsGuard)
export class ReleaseController {
  @Post('deploy')
  @HttpCode(202)
  @Permissions(Permission.SYSTEM_CONFIG, Permission.MANAGE_INTEGRATIONS)
  public deploy(@Body() body: { channel: 'pre-release' | 'production'; artifactId: string }): DeployResponse {
    return { deploymentId: `dep_${Date.now()}`, status: 'started', channel: body.channel, artifactId: body.artifactId };
  }

  @Post('rollback')
  @HttpCode(202)
  @Permissions(Permission.SYSTEM_CONFIG)
  public rollback(): RollbackResponse {
    return { status: 'started' };
  }
}
