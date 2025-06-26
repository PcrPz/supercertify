// src/candidates/dto/create-candidate.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateCandidateDto {
  @IsNotEmpty()
  @IsString()
  C_FirstName: string;

  @IsNotEmpty()
  @IsString()
  C_LastName: string;

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