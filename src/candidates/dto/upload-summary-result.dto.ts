// src/candidates/dto/upload-summary-result.dto.ts
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class UploadSummaryResultDto {
  @IsOptional()
  @IsString()
  resultNotes?: string;

  @IsOptional()
  @IsEnum(['pass', 'fail', 'pending'])
  overallStatus?: 'pass' | 'fail' | 'pending';
}