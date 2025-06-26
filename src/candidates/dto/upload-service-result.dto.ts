// src/candidates/dto/upload-service-result.dto.ts
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class UploadServiceResultDto {
  @IsOptional()
  @IsString()
  resultNotes?: string;

  @IsOptional()
  @IsEnum(['pass', 'fail', 'pending'])
  resultStatus?: 'pass' | 'fail' | 'pending';
}
