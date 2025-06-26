// src/candidates/dto/update-candidate.dto.ts
import { IsEmail, IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateCandidateDto {
  @IsOptional()
  @IsString()
  C_FirstName?: string;

  @IsOptional()
  @IsString()
  C_LastName?: string;

  @IsOptional()
  @IsEmail()
  C_Email?: string;

  @IsOptional()
  @IsString()
  C_Company_Name?: string;

  @IsOptional()
  @IsArray()
  services?: string[];
}