import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Candidate } from '../../candidates/schemas/candidate.schema';

// เพิ่ม Interface สำหรับ OrderService
export interface OrderService {
  service: string;
  title: string;
  quantity: number;
  price: number;
}

// เพิ่ม Interface สำหรับการชำระเงิน
export interface PaymentInfo {
  paymentMethod: string;
  paymentStatus: string;
  transferInfo?: {
    name?: string;
    date?: string;
    amount?: string;
    reference?: string;
    receiptUrl?: string;
  };
  timestamp?: Date;
  paymentUpdatedAt?: Date;
  paymentUpdatedBy?: string;
}

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop()
  Order_ID: string;

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

  // เพิ่ม services เข้าไปใน schema
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

  // เพิ่มข้อมูลการชำระเงิน
  @Prop({
    type: {
      paymentMethod: { 
        type: String, 
        enum: ['qr_payment', 'bank_transfer'] 
      },
      paymentStatus: { 
        type: String, 
        enum: ['pending_verification', 'completed', 'awaiting_payment', 'failed', 'refunded'],
        default: 'awaiting_payment'
      },
      transferInfo: {
        name: String,
        date: String,
        amount: String,
        reference: String,
        receiptUrl: String
      },
      timestamp: Date,
      paymentUpdatedAt: Date,
      paymentUpdatedBy: String
    }
  })
  paymentInfo: PaymentInfo;
  
  // Flag สำหรับการแจ้งเตือนอีเมล
  @Prop({ default: false })
  paymentNotificationSent: boolean;
  
  @Prop({ default: false })
  paymentApprovalSent: boolean;
}

export const OrderSchema = SchemaFactory.createForClass(Order);