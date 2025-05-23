// src/orders/schemas/order.schema.ts
// ตรวจสอบว่า Schema มี field ที่จำเป็น

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Candidate } from '../../candidates/schemas/candidate.schema';

export interface OrderService {
  service: string;
  title: string;
  quantity: number;
  price: number;
}

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: any;

  @Prop({ required: true, enum: ['company', 'personal'] })
  OrderType: string;

  @Prop({ 
    default: 'awaiting_payment', 
    enum: [
      'awaiting_payment',
      'pending_verification',
      'payment_verified',
      'processing',
      'completed',
      'cancelled'
    ] 
  })
  OrderStatus: string;

  @Prop()
  TrackingNumber: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Candidate' }] })
  candidates: Candidate[];

  @Prop({ required: true })
  TotalPrice: number;

  @Prop({ required: true })
  SubTotalPrice: number;

  @Prop({ 
    type: [{
      service: { type: String, required: true },
      title: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }], 
    required: true 
  })
  services: OrderService[];
  
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Payment' })
  payment: MongooseSchema.Types.ObjectId;
  
  // ✅ ตรวจสอบว่ามี field เหล่านี้
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Coupon', default: null })
  coupon: MongooseSchema.Types.ObjectId;
  
  @Prop({ default: 0 })
  couponDiscount: number; // ✅ จำนวนเงินส่วนลดจากคูปอง
  
  @Prop({ default: 0 })
  promotionDiscount: number; // ✅ จำนวนเงินส่วนลดจากโปรโมชั่น
  
  @Prop({ default: false })
  paymentNotificationSent: boolean;
  
  @Prop({ default: false })
  paymentApprovalSent: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);