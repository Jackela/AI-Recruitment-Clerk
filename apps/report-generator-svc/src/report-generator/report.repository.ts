import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportRepository {
  async updateResumeRecord(_resumeId: string, _data: any): Promise<void> {
    throw new Error('ReportRepository.updateResumeRecord not implemented');
  }
}
