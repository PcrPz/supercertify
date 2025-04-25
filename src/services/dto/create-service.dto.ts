// src/services/dto/create-service.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

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
}