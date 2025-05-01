// src/payments/schemas/payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Order } from '../../orders/schemas/order.schema';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop()
  P_ID: string;

  @Prop()
  P_Uname: string;

  @Prop({ required: true, enum: ['credit_card', 'bank_transfer', 'prompt_pay'] })
  P_Type: string;

  @Prop({ default: 'pending', enum: ['pending', 'processing', 'completed', 'failed'] })
  P_Status: string;

  @Prop()
  P_Email: string;

  @Prop()
  P_Tel: string;

  @Prop({ required: true, type: Number })
  Amount: number;

  // ความสัมพันธ์กับ Order
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', required: true })
  order: Order;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
