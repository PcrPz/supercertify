// src/coupons/dto/create-coupon.dto.ts
import { IsNotEmpty, IsNumber, IsDateString, IsOptional, IsString, IsBoolean, Min, Max, IsEnum } from 'class-validator';
import { CouponType } from '../schemas/coupon.schema';

export class CreateCouponDto {
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
  @IsBoolean()
  isActive?: boolean;
  
  @IsOptional()
  @IsString()
  description?: string;
  
  // ✅ เพิ่ม couponType
  @IsOptional()
  @IsEnum(CouponType)
  couponType?: CouponType;
  
  @IsOptional()
  @IsString()
  userId?: string;
}