// src/services/schemas/service.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ServiceDocument = Service & Document;

@Schema({ timestamps: true })
export class Service {
  @Prop({ required: true })
  Service_Title: string;

  @Prop()
  Service_Desc: string;

  @Prop({ required: true })
  Price: number;

  @Prop()
  Service_Image: string;

  @Prop([String])
  List_File: string[];
}

export const ServiceSchema = SchemaFactory.createForClass(Service);