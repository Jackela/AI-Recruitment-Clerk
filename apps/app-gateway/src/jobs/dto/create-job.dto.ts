import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Describes the create job data transfer object.
 */
export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  public jobTitle!: string;

  @IsString()
  @IsNotEmpty()
  public jdText!: string;
}
