// src/orders/dto/update-payment.dto.ts
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdatePaymentDto {
  @IsNotEmpty()
  @IsEnum(['qr_payment', 'bank_transfer'])
  paymentMethod: string;
  
  @IsNotEmpty()
  @IsEnum(['pending_verification', 'completed', 'awaiting_payment', 'failed', 'refunded'])
  paymentStatus: string;
  
  @IsOptional()
  @IsObject()
  transferInfo?: {
    name?: string;
    date?: string;
    amount?: string;
    reference?: string;
    receiptUrl?: string;
  };
  
  @IsOptional()
  timestamp?: Date;
}

export class UpdatePaymentStatusDto {
  @IsNotEmpty()
  @IsEnum(['pending_verification', 'completed', 'awaiting_payment', 'failed', 'refunded'])
  paymentStatus: string;
}