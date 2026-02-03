import { ValueObject } from './base/value-object.js';

/**
 * Represents the submission metadata.
 */
export class SubmissionMetadata extends ValueObject<{
  ip: string;
  userAgent: string;
  timestamp: Date;
}> {
  /**
   * Performs the restore operation.
   * @param data - The data.
   * @returns The SubmissionMetadata.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static restore(data: any): SubmissionMetadata {
    return new SubmissionMetadata({
      ...data,
      timestamp: new Date(data.timestamp),
    });
  }

  /**
   * Performs the ip operation.
   * @returns The string value.
   */
  public get ip(): string {
    return this.props.ip;
  }
}
