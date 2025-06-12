import { IsOptional, IsNumber, IsString, Min, Max, IsBoolean, IsArray, IsObject } from 'class-validator';

export class UpdateReviewDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  tags?: string[];
}

export class AdminUpdateReviewDto {
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsString()
  adminResponse?: string;
  
  @IsOptional()
  @IsBoolean()
  isDisplayed?: boolean;
  
  // เพิ่มฟิลด์ต่อไปนี้
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
  
  @IsOptional()
  @IsArray()
  tags?: string[];
}