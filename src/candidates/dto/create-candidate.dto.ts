// src/candidates/dto/create-candidate.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateCandidateDto {
  @IsNotEmpty()
  @IsString()
  C_FullName: string;

  @IsOptional()
  @IsEmail()
  C_Email?: string;

  @IsOptional()
  @IsString()
  C_Company_Name?: string;

  @IsOptional()
  @IsArray()
  services?: string[]; // IDs ของ services
}