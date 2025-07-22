import { Injectable } from '@nestjs/common';

@Injectable()
export class LlmService {
  async generateReportMarkdown(_event: any): Promise<string> {
    throw new Error('LlmService.generateReportMarkdown not implemented');
  }
}
