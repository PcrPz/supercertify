// src/documents/dto/upload-document.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UploadDocumentDto {
  @IsNotEmpty()
  @IsString()
  candidateId: string;
  
  @IsNotEmpty()
  @IsString()
  serviceId: string;
  
  @IsNotEmpty()
  @IsString()
  documentType: string; // ประเภทของเอกสาร (เช่น "id_card", "house_registration")
  
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}