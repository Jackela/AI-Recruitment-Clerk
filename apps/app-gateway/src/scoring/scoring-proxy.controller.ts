import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import pdf from 'pdf-parse-fork';
import { MetricsService } from '../ops/metrics.service';

/**
 * Exposes endpoints for scoring proxy.
 */
@Controller('scoring')
export class ScoringProxyController {
  constructor(private readonly metrics: MetricsService) {}
  /**
   * Performs the gap analysis operation.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @Post('gap-analysis')
  async gapAnalysis(@Body() body: any) {
    this.metrics.incExposure();
    const base =
      process.env.SCORING_ENGINE_URL || 'http://scoring-engine-svc:3000';
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
      this.metrics.incSuccess();
      return data;
    } catch (error) {
      this.metrics.incError();
      throw new HttpException(
        {
          message: 'Failed to reach scoring engine',
          error: (error as Error).message,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Performs the gap analysis file operation.
   * @param file - The file.
   * @param body - The body.
   * @returns The result of the operation.
   */
  @Post('gap-analysis-file')
  @UseInterceptors(FileInterceptor('resume'))
  async gapAnalysisFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { jdText?: string },
  ) {
    if (!file) {
      throw new HttpException(
        { message: 'No file uploaded' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Extract resume text from file (pdf or text)
    const filename = (file.originalname || '').toLowerCase();
    const mimetype = file.mimetype || '';
    let resumeText = '';
    try {
      if (mimetype.includes('pdf') || filename.endsWith('.pdf')) {
        const parsed = await pdf(file.buffer as Buffer);
        resumeText = parsed.text || '';
      } else if (
        mimetype.startsWith('text/') ||
        filename.endsWith('.txt') ||
        filename.endsWith('.md') ||
        filename.endsWith('.text')
      ) {
        resumeText = (file.buffer as Buffer).toString('utf-8');
      } else {
        throw new HttpException(
          { message: 'Unsupported file type' },
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        );
      }
    } catch (err) {
      throw new HttpException(
        {
          message: 'Failed to extract resume text',
          error: (err as Error).message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const base =
      process.env.SCORING_ENGINE_URL || 'http://scoring-engine-svc:3000';
    const url = `${base.replace(/\/$/, '')}/gap-analysis`;
    const payload = { jdText: body?.jdText || '', resumeText };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new HttpException(
          data || { message: 'Gap analysis failed' },
          res.status as HttpStatus,
        );
      }
      this.metrics.incSuccess();
      return data;
    } catch (error) {
      // As a fallback, perform improved token matching locally if scoring engine is unreachable
      const jdSkills = tokenize(body?.jdText || '');
      const resumeSkills = tokenize(resumeText || '');
      const matched = jdSkills.filter((s) => resumeSkills.includes(s));
      const missing = jdSkills.filter((s) => !resumeSkills.includes(s));
      this.metrics.incError();
      return {
        matchedSkills: matched,
        missingSkills: missing,
        suggestedSkills: [],
      };
    }

    function tokenize(text: string) {
      // Align with scoring-engine tokenization to ensure consistent results
      const spaced = (text || '').replace(/([a-z])([A-Z])/g, '$1 $2');
      const base = spaced
        .toLowerCase()
        .split(/[^a-z0-9+#\.\-]+/)
        .filter((t) => t && t.length > 1);
      const out = new Set<string>();
      for (const t of base) {
        out.add(t);
        if (t.includes('aws')) out.add('aws');
        if (t.includes('azure')) out.add('azure');
        if (t.includes('kubernetes')) out.add('kubernetes');
        if (t.includes('k8s')) out.add('kubernetes');
        if (t.includes('gcp')) out.add('gcp');
        if (t.includes('eks')) out.add('kubernetes');
      }
      return Array.from(out);
    }
  }
}
