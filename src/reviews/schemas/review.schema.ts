import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Order } from '../../orders/schemas/order.schema';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', required: true })
  order: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true })
  comment: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  verifiedBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, default: null })
  verifiedAt: Date;

  @Prop({ default: true })
  isPublic: boolean;

  // เพิ่มฟิลด์ isDisplayed สำหรับให้ Admin เลือกว่า Review ไหนควรแสดงบนหน้าเว็บหลัก
  @Prop({ default: false })
  isDisplayed: boolean;

  @Prop({ default: [] })
  tags: string[];

  @Prop({ default: null })
  adminResponse: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  adminResponseBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, default: null })
  adminResponseAt: Date;
  
  // เก็บข้อมูลเพิ่มเติมของ Order เพื่อไม่ต้อง join ทุกครั้ง
  @Prop({ type: Object, default: {} })
  orderDetails: {
    orderType?: string;
    totalPrice?: number;
    orderDate?: Date;
    services?: Array<{
      service: string;
      title: string;
      quantity: number;
      price: number;
    }>;
    trackingNumber?: string;
  };
  
  // เก็บข้อมูลเพิ่มเติมของ User เพื่อไม่ต้อง join ทุกครั้ง
  @Prop({ type: Object, default: {} })
  userDetails: {
    username?: string;
    email?: string;
    fullName?: string;
    profilePicture?: string;
  };
}

export const ReviewSchema = SchemaFactory.createForClass(Review);