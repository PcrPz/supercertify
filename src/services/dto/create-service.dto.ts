// src/services/dto/create-service.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, ValidateNested, IsBoolean, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class RequiredDocumentDto {
  @IsString()
  @IsNotEmpty()
  document_id: string;
  
  @IsString()
  @IsNotEmpty()
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
  
  @IsNotEmpty() // เพิ่ม validation ว่าจำเป็นต้องมี
  @IsArray()
  @ArrayMinSize(1) // ต้องมีอย่างน้อย 1 รายการ
  @ValidateNested({ each: true })
  @Type(() => RequiredDocumentDto)
  RequiredDocuments: RequiredDocumentDto[];
}