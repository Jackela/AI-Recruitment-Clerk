import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ResumeRepository } from '../repositories/resume.repository';
import { GridFsService } from '../gridfs/gridfs.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly resumeRepository: ResumeRepository,
    private readonly gridFsService: GridFsService
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  async getHealth() {
    const dbHealth = await this.resumeRepository.healthCheck();
    const gridFsHealth = await this.gridFsService.healthCheck();
    
    const overallStatus = dbHealth.status === 'healthy' && gridFsHealth.status === 'healthy' ? 'ok' : 'degraded';
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'resume-parser-svc',
      database: {
        status: dbHealth.status,
        resumeCount: dbHealth.count
      },
      gridfs: {
        status: gridFsHealth.status,
        bucket: gridFsHealth.bucket,
        connected: gridFsHealth.connected
      }
    };
  }
}
