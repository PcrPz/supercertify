// src/payments/schemas/payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Order } from '../../orders/schemas/order.schema';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop()
  Payment_ID: string;

  @Prop({ 
    required: true, 
    enum: ['qr_payment', 'bank_transfer'] 
  })
  paymentMethod: string;

  @Prop({ 
    required: true, 
    default: 'awaiting_payment',
    enum: ['pending_verification', 'completed', 'awaiting_payment', 'failed', 'refunded']
  })
  paymentStatus: string;

  @Prop({ type: Object })
  transferInfo: {
    name?: string;
    date?: string;
    amount?: string;
    reference?: string;
    receiptUrl?: string;
  };

  @Prop({ type: Date })
  timestamp: Date;

  @Prop({ type: Date })
  paymentUpdatedAt: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  paymentUpdatedBy: string;

  // Relationship with Order
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', required: true })
  order: Order;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);