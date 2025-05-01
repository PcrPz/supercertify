// src/packages/dto/create-package.dto.ts
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class CreatePackageDto {
  @IsNotEmpty()
  @IsString()
  Package_Title: string;

  @IsOptional()
  @IsString()
  Package_Desc?: string;

  @IsNotEmpty()
  @IsNumber()
  Price: number;

  @IsOptional()
  @IsArray()
  services?: string[]; // รับเป็น array ของ service IDs
}