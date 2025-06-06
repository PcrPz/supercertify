import { IsNotEmpty, IsNumber, IsString, Min, Max, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsNotEmpty()
  @IsString()
  comment: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsArray()
  tags?: string[];
}