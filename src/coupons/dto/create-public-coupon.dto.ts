// src/coupons/dto/create-public-coupon.dto.ts
import { IsNotEmpty, IsNumber, IsDateString, IsOptional, IsString, IsBoolean, Min, Max, IsEnum } from 'class-validator';
import { CouponType } from '../schemas/coupon.schema';

export class CreatePublicCouponDto {
  @IsNotEmpty()
  @IsString()
  code: string;
  
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent: number;
  
  @IsNotEmpty()
  @IsDateString()
  expiryDate: string;
  
  @IsOptional()
  @IsString()
  description?: string;
  
  @IsOptional()
  @IsNumber()
  remainingClaims?: number;
  
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  
  // ✅ เพิ่ม couponType
  @IsOptional()
  @IsEnum(CouponType)
  couponType?: CouponType;
}