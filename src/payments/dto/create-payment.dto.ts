// src/payments/dto/create-payment.dto.ts
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  P_Uname?: string;

  @IsNotEmpty()
  @IsEnum(['credit_card', 'bank_transfer', 'prompt_pay'])
  P_Type: string;

  @IsOptional()
  @IsEmail()
  P_Email?: string;

  @IsOptional()
  @IsString()
  P_Tel?: string;

  @IsNotEmpty()
  @IsNumber()
  Amount: number;

  @IsNotEmpty()
  @IsString()
  orderId: string; // Order ID ที่เกี่ยวข้อง
}