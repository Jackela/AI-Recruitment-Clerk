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
      // Insert spaces at lower-to-upper boundaries to split concatenations like "DevOpsAWS"
      const spaced = (text || '').replace(/([a-z])([A-Z])/g, '$1 $2');
      const base = spaced
        .toLowerCase()
        .split(/[^a-z0-9+#\.\-]+/)
        .filter((t) => t && t.length > 1);

      const out = new Set<string>();
      for (const t of base) {
        out.add(t);
        // Heuristic expansions for common tech acronyms embedded in tokens
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
