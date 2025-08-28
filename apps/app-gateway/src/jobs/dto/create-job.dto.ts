import { IsString, IsNotEmpty } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  jobTitle!: string;

  @IsString()
  @IsNotEmpty()
  jdText!: string;
}
