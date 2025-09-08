import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';

@Controller('scoring')
export class ScoringProxyController {
  @Post('gap-analysis')
  async gapAnalysis(@Body() body: any) {
    const base = process.env.SCORING_ENGINE_URL || 'http://scoring-engine-svc:3000';
    const url = `${base.replace(/\/$/, '')}/gap-analysis`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new HttpException(
          data || { message: 'Gap analysis failed' },
          res.status as HttpStatus,
        );
      }
      return data;
    } catch (error) {
      throw new HttpException(
        { message: 'Failed to reach scoring engine', error: (error as Error).message },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}

