// src/settings/schemas/setting.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SettingDocument = Setting & Document;

@Schema({ timestamps: true })
export class Setting {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ type: Object, required: true })
  value: any;

  @Prop()
  description: string;

  @Prop({ default: 'general' })
  group: string;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);