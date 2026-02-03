import { Controller, Get } from '@nestjs/common';

/**
 * Minimal controller exposing embedding service health status.
 */
@Controller('embedding')
export class EmbeddingController {
  @Get('health')
  public healthCheck(): { status: string } {
    return { status: 'ok' };
  }
}
