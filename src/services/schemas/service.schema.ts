// src/services/schemas/service.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

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

  @Prop({ 
    required: true, 
    unique: true,
    trim: true // เพิ่มการตัดช่องว่าง
  })
  Service_Title: string;

  @Prop({ 
    default: '',
    trim: true 
  })
  Service_Desc: string;

  @Prop({ 
    required: true, 
    min: 0,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Price must be a positive number'
    }
  })
  Price: number;

  @Prop({ default: null })
  Service_Image: string;

  @Prop({ 
    type: [String], 
    default: [] 
  })
  List_File: string[];
  
  @Prop({
    type: [{
      document_id: { type: String, required: true, trim: true },
      document_name: { type: String, required: true, trim: true },
      required: { type: Boolean, default: true },
      file_types: { 
        type: [String], 
        default: ['pdf', 'jpg', 'png', 'jpeg'],
        validate: {
          validator: function(v) {
            return Array.isArray(v) && v.length > 0;
          },
          message: 'file_types must be a non-empty array'
        }
      },
      max_size: { type: Number, default: 5000000 } // 5MB default
    }],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'RequiredDocuments must have at least one document'
    }
  })
  RequiredDocuments: RequiredDocument[];
}

export const ServiceSchema = SchemaFactory.createForClass(Service);
