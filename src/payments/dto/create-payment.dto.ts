// src/payments/dto/create-payment.dto.ts
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer'; 
import { Express } from 'express';

export class TransferInfoDto {
  @IsOptional()
  @IsString()
  name?: string;
  
  @IsOptional()
  @IsString()
  date?: string;
  
  @IsOptional()
  @IsString()
  amount?: string;
  
  @IsOptional()
  @IsString()
  reference?: string;
  
  @IsOptional()
  @IsString()
  receiptUrl?: string;
}

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsEnum(['qr_payment', 'bank_transfer'])
  paymentMethod: string;
  
  @IsOptional()
  @Transform(({ value }) => {
    // แปลงข้อมูลจาก FormData เป็น object
    if (typeof value === 'object') return value;
    
    // ถ้าเป็น string ให้พยายามแปลงเป็น JSON
    try {
      return JSON.parse(value);
    } catch (e) {
      return {};
    }
  })
  transferInfo?: TransferInfoDto;
  
  @IsNotEmpty()
  @IsString()
  orderId: string; // Reference to the Order
}