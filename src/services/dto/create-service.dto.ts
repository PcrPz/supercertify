// src/services/dto/create-service.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class RequiredDocumentDto {
  @IsString()
  document_id: string;
  
  @IsString()
  document_name: string;
  
  @IsBoolean()
  required: boolean;
  
  @IsArray()
  @IsString({ each: true })
  file_types: string[];
  
  @IsOptional()
  @IsNumber()
  max_size?: number;
}

export class CreateServiceDto {
  @IsNotEmpty()
  @IsString()
  Service_Title: string;

  @IsOptional()
  @IsString()
  Service_Desc?: string;

  @IsNotEmpty()
  @IsNumber()
  Price: number;

  @IsOptional()
  @IsString()
  Service_Image?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  List_File?: string[];
  
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequiredDocumentDto)
  RequiredDocuments?: RequiredDocumentDto[];
}