import { IsUUID } from 'class-validator';

export class JobParamsDto {
  @IsUUID()
  jobId!: string;
}
