import { ValueObject } from './base/value-object.js';

export class SubmissionMetadata extends ValueObject<{
  ip: string;
  userAgent: string;
  timestamp: Date;
}> {
  static restore(data: any): SubmissionMetadata {
    return new SubmissionMetadata({
      ...data,
      timestamp: new Date(data.timestamp)
    });
  }
  
  get ip(): string {
    return this.props.ip;
  }
}
