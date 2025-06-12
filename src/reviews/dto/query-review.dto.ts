// src/reviews/dto/query-review.dto.ts
import { Type } from 'class-transformer';
import { IsOptional, IsNumber, IsString, IsEnum, IsBoolean } from 'class-validator';

export class QueryReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minRating?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isDisplayed?: boolean;  // เพิ่มพารามิเตอร์ isDisplayed
}