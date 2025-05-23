// src/orders/dto/create-order.dto.ts
import { IsEnum, IsNotEmpty, IsNumber, IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCandidateDto } from '../../candidates/dto/create-candidate.dto';

class OrderServiceDto {
  @IsNotEmpty()
  @IsString()
  service: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class CreateOrderDto {
  @IsNotEmpty()
  @IsEnum(['company', 'personal'])
  OrderType: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderServiceDto)
  services: OrderServiceDto[];

  @IsNotEmpty()
  @IsNumber()
  subtotalPrice: number;

  @IsNotEmpty()
  @IsNumber()
  totalPrice: number;

  @IsOptional()
  @IsNumber()
  promotionDiscount?: number;

  @IsOptional()
  @IsString()
  couponCode?: string; // ✅ ต้องมี field นี้

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCandidateDto)
  candidates: CreateCandidateDto[];
}