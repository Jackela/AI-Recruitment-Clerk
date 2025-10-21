import { Controller, Get } from '@nestjs/common';

/**
 * Minimal controller exposing embedding service health status.
 */
@Controller('embedding')
export class EmbeddingController {
  @Get('health')
  healthCheck(): { status: string } {
    return { status: 'ok' };
  }
}
