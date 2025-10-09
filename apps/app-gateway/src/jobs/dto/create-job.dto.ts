import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Describes the create job data transfer object.
 */
export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  jobTitle!: string;

  @IsString()
  @IsNotEmpty()
  jdText!: string;
}
