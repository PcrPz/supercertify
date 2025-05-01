// src/services/dto/update-service.dto.ts
import { IsOptional, IsNumber, IsString, IsArray } from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  Service_Title?: string;

  @IsOptional()
  @IsString()
  Service_Desc?: string;

  @IsOptional()
  @IsNumber()
  Price?: number;

  @IsOptional()
  @IsString()
  Service_Image?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  List_File?: string[];
}