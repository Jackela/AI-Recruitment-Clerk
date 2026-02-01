import { Controller, Get } from '@nestjs/common';
import type { AppService } from './app.service';
import type { ResumeRepository } from '../repositories/resume.repository';
import type { GridFsService } from '../gridfs/gridfs.service';

/**
 * Exposes endpoints for app.
 */
@Controller()
export class AppController {
  /**
   * Initializes a new instance of the App Controller.
   * @param appService - The app service.
   * @param resumeRepository - The resume repository.
   * @param gridFsService - The grid fs service.
   */
  constructor(
    private readonly appService: AppService,
    private readonly resumeRepository: ResumeRepository,
    private readonly gridFsService: GridFsService,
  ) {}

  /**
   * Retrieves data.
   * @returns The result of the operation.
   */
  @Get()
  getData() {
    return this.appService.getData();
  }

  /**
   * Retrieves health.
   * @returns The result of the operation.
   */
  @Get('health')
  async getHealth() {
    const dbHealth = await this.resumeRepository.healthCheck();
    const gridFsHealth = await this.gridFsService.healthCheck();

    const overallStatus =
      dbHealth.status === 'healthy' && gridFsHealth.status === 'healthy'
        ? 'ok'
        : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'resume-parser-svc',
      database: {
        status: dbHealth.status,
        resumeCount: dbHealth.count,
      },
      gridfs: {
        status: gridFsHealth.status,
        bucket: gridFsHealth.bucket,
        connected: gridFsHealth.connected,
      },
    };
  }
}
