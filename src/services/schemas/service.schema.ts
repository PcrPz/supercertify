// src/services/schemas/service.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document ,Schema as MongooseSchema } from 'mongoose';

export interface RequiredDocument {
  document_id: string;
  document_name: string;
  required: boolean;
  file_types: string[];
  max_size?: number;
}

export type ServiceDocument = Service & Document;

@Schema({ timestamps: true })
export class Service {

  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: any;

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
  
  @Prop({
    type: [{
      document_id: { type: String, required: true },
      document_name: { type: String, required: true },
      required: { type: Boolean, default: true },
      file_types: { type: [String], default: ['pdf', 'jpg', 'png', 'jpeg'] },
      max_size: { type: Number, default: 5000000 } // 5MB default
    }],
    default: []
  })
  RequiredDocuments: RequiredDocument[];
}

export const ServiceSchema = SchemaFactory.createForClass(Service);