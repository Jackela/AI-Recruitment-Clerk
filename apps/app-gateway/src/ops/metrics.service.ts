import { Injectable } from '@nestjs/common';

interface MetricsSnapshot {
  exposure: number;
  success: number;
  error: number;
  cancel: number;
  successRate: number;
}

@Injectable()
export class MetricsService {
  private exposure = 0;
  private success = 0;
  private error = 0;
  private cancel = 0;

  public incExposure(n = 1): void { this.exposure += n; }
  public incSuccess(n = 1): void { this.success += n; }
  public incError(n = 1): void { this.error += n; }
  public incCancel(n = 1): void { this.cancel += n; }

  public getSnapshot(): MetricsSnapshot {
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

