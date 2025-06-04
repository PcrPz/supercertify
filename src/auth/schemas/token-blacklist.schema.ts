// src/auth/schemas/token-blacklist.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TokenBlacklistDocument = TokenBlacklist & Document;

@Schema({
  timestamps: true,
})
export class TokenBlacklist {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const TokenBlacklistSchema = SchemaFactory.createForClass(TokenBlacklist);

// สร้าง index ที่หมดอายุอัตโนมัติ เพื่อให้ MongoDB ลบเอกสารที่หมดอายุโดยอัตโนมัติ
TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });