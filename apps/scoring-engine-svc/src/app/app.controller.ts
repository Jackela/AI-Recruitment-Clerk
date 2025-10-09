import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AppService } from './app.service';
import type {
  GapAnalysisRequestDto,
  GapAnalysisResultDto,
} from '../dto/gap-analysis.dto';

/**
 * Exposes endpoints for app.
 */
@Controller()
export class AppController {
  /**
   * Initializes a new instance of the App Controller.
   * @param appService - The app service.
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Performs the gap analysis operation.
   * @param body - The body.
   * @returns The GapAnalysisResultDto.
   */
  @MessagePattern('scoring.gap-analysis')
  gapAnalysis(body: GapAnalysisRequestDto): GapAnalysisResultDto {
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


