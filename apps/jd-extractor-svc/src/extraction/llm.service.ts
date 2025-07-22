import { Injectable } from '@nestjs/common';

export interface JdDTO {
  requiredSkills: { name: string; weight: number }[];
  experienceYears: { min: number; max: number };
  educationLevel: 'bachelor' | 'master' | 'phd' | 'any';
  softSkills: string[];
}

@Injectable()
export class LlmService {
  // This method will be mocked in tests; real implementation is out of scope
  async extractJd(jdText: string): Promise<JdDTO> {
    throw new Error('Not implemented');
  }
}
