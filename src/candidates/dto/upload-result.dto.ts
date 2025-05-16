// src/candidates/dto/upload-result.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export class UploadResultDto {
  @IsOptional()
  @IsString()
  resultNotes?: string;

  @IsOptional()
  @IsEnum(['pass', 'fail', 'pending'])
  resultStatus?: string;
}