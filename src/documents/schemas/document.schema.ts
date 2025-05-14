// แก้ไขไฟล์ src/documents/schemas/document.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Candidate } from '../../candidates/schemas/candidate.schema';
import { Service } from '../../services/schemas/service.schema';

export type DocumentDocument = DocumentFile & Document;

@Schema({ timestamps: true })
export class DocumentFile {
  @Prop({ required: true })
  File_ID: string;
  
  @Prop({ required: true })
  File_Path: string;
  
  @Prop({ required: true })
  File_Name: string;
  
  @Prop({ required: true })
  File_Type: string;
  
  @Prop()
  File_Size: number;
  
  @Prop({ required: true })
  Document_Type: string; // ประเภทของเอกสาร (เช่น "id_card", "house_registration")
  
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Candidate', required: true })
  candidate: MongooseSchema.Types.ObjectId;
  
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Service', required: true })
  service: MongooseSchema.Types.ObjectId;
  
  @Prop({ default: false })
  isVerified: boolean;
  
  @Prop({ type: Date, default: null, required: false })
  verifiedAt: Date | null;
  
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null, required: false })
  verifiedBy: MongooseSchema.Types.ObjectId | null;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentFile);