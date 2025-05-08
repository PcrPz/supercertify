// src/payments/dto/create-payment.dto.ts
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsEnum(['qr_payment', 'bank_transfer'])
  paymentMethod: string;
  
  @IsOptional()
  @IsObject()
  transferInfo?: {
    name?: string;
    date?: string;
    amount?: string;
    reference?: string;
    receiptUrl?: string;
  };
  
  @IsNotEmpty()
  @IsString()
  orderId: string; // Reference to the Order
}