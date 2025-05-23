// src/coupons/dto/update-coupon.dto.ts
import { IsOptional, IsNumber, IsDateString, IsString, IsBoolean, Min, Max, IsEnum } from 'class-validator';
import { CouponType } from '../schemas/coupon.schema';

export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  code?: string;
  
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;
  
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
  
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  
  @IsOptional()
  @IsString()
  description?: string;
  
  // ✅ เพิ่ม couponType
  @IsOptional()
  @IsEnum(CouponType)
  couponType?: CouponType;
}