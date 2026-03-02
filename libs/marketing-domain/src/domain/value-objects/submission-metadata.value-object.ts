import { ValueObject, type SerializedRestoreData } from './base/value-object.js';

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
  public static restore(data: SerializedRestoreData<{
    ip: string;
    userAgent: string;
    timestamp: Date;
  }>): SubmissionMetadata {
    return new SubmissionMetadata({
      ip: data.ip,
      userAgent: data.userAgent,
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
