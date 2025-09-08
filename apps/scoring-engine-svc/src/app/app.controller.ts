import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import {
  GapAnalysisRequestDto,
  GapAnalysisResultDto,
} from '../dto/gap-analysis.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Post('gap-analysis')
  gapAnalysis(@Body() body: GapAnalysisRequestDto): GapAnalysisResultDto {
    const jdSkills = body.jdSkills?.length
      ? normalize(body.jdSkills)
      : tokenize(body.jdText || '');
    const resumeSkills = body.resumeSkills?.length
      ? normalize(body.resumeSkills)
      : tokenize(body.resumeText || '');

    const matched = jdSkills.filter((s) => resumeSkills.includes(s));
    const missing = jdSkills.filter((s) => !resumeSkills.includes(s));
    return { matchedSkills: matched, missingSkills: missing, suggestedSkills: [] };

    function normalize(arr: string[]) {
      return Array.from(
        new Set(arr.map((s) => s.toLowerCase().trim()).filter((s) => !!s)),
      );
    }
    function tokenize(text: string) {
      return normalize(
        (text || '')
          .toLowerCase()
          .split(/[^a-z0-9+#\.\-]+/)
          .filter((t) => t && t.length > 1),
      );
    }
  }
}
