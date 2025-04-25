// src/packages/schemas/package.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Service } from '../../services/schemas/service.schema';

export type PackageDocument = Package & Document;

@Schema({ timestamps: true })
export class Package {
  @Prop({ required: true })
  Package_Title: string;

  @Prop()
  Package_Desc: string;

  @Prop({ required: true })
  Price: number;

  // เก็บความสัมพันธ์กับ Service โดยอ้างอิง _id
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Service' }] })
  services: Service[];
}

export const PackageSchema = SchemaFactory.createForClass(Package);