import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private exposure = 0;
  private success = 0;
  private error = 0;
  private cancel = 0;

  incExposure(n = 1) { this.exposure += n; }
  incSuccess(n = 1) { this.success += n; }
  incError(n = 1) { this.error += n; }
  incCancel(n = 1) { this.cancel += n; }

  getSnapshot() {
    const total = Math.max(1, this.exposure);
    return {
      exposure: this.exposure,
      success: this.success,
      error: this.error,
      cancel: this.cancel,
      successRate: this.success / total,
    };
  }
}

