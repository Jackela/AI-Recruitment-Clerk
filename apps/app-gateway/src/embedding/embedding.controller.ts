import { Body, Controller, Get, Post } from '@nestjs/common';
import type { EmbeddingService } from './embedding.service';

/**
 * Controller exposing embedding service health status and embedding creation.
 */
@Controller('embedding')
export class EmbeddingController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Get('health')
  public healthCheck(): { status: string } {
    return { status: 'ok' };
  }

  @Post()
  public async createEmbedding(@Body() body: { text: string }): Promise<{ embedding: number[] }> {
    const embedding = await this.embeddingService.createEmbedding(body.text);
    return { embedding };
  }
}

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
