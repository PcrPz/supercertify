// src/coupons/schemas/coupon.schema.ts - แก้ไข Schema

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type CouponDocument = Coupon & Document;

export enum CouponType {
  PUBLIC = 'PUBLIC',      // คูปองสาธารณะทั่วไป
  SURVEY = 'SURVEY',      // คูปองจากการทำแบบสอบถาม
  PRIVATE = 'PRIVATE',    // คูปองส่วนตัว
  SPECIAL = 'SPECIAL'     // คูปองพิเศษอื่นๆ
}

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  code: string;
  
  @Prop({ required: true })
  discountPercent: number;
  
  @Prop({ required: true })
  expiryDate: Date;
  
  @Prop({ default: true })
  isActive: boolean;
  
  @Prop({ default: false })
  isUsed: boolean;
  
  @Prop({ default: null })
  usedAt: Date;
  
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', default: null })
  usedInOrder: MongooseSchema.Types.ObjectId;
  
  // ฟิลด์สําหรับระบบคูปองสาธารณะ
  @Prop({ default: false })
  isPublic: boolean;
  
  @Prop({ default: true })
  isClaimable: boolean;
  
  @Prop({ default: -1 })
  remainingClaims: number;
  
  @Prop({ default: '' })
  description: string;
  
  // ฟิลด์สําหรับคูปองส่วนตัว
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  claimedBy: MongooseSchema.Types.ObjectId;
  
  @Prop({ default: null })
  claimedAt: Date;
  
  // เพิ่มฟิลด์ใหม่เพื่ออ้างอิงถึงคูปองต้นฉบับ
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Coupon', default: null })
  originalCouponId: MongooseSchema.Types.ObjectId;

  // ✅ เพิ่ม couponType field
  @Prop({ 
    type: String, 
    enum: Object.values(CouponType),
    default: CouponType.PUBLIC 
  })
  couponType: CouponType;

  // ✅ เพิ่ม timestamps fields (จะถูกสร้างอัตโนมัติจาก timestamps: true)
  createdAt?: Date;
  updatedAt?: Date;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);