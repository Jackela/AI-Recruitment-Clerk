import { IsUUID } from 'class-validator';

/**
 * Describes the job params data transfer object.
 */
export class JobParamsDto {
  @IsUUID()
  public jobId!: string;
}
