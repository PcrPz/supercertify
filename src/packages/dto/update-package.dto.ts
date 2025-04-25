// src/packages/dto/update-package.dto.ts
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  Package_Title?: string;

  @IsOptional()
  @IsString()
  Package_Desc?: string;

  @IsOptional()
  @IsNumber()
  Price?: number;

  @IsOptional()
  @IsArray()
  services?: string[]; // รับเป็น array ของ service IDs
}