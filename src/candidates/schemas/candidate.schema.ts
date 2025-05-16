// src/candidates/schemas/candidate.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Service } from '../../services/schemas/service.schema';

export type CandidateDocument = Candidate & Document;

@Schema({ timestamps: true })
export class Candidate {
    
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: any;

  @Prop({ required: true })
  C_FullName: string;

  @Prop()
  C_Email: string;

  @Prop()
  C_Company_Name: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Service' }] })
  services: Service[];
  
  @Prop({
  type: {
    resultFile: String,         // URL ของไฟล์ผลการตรวจสอบ
    resultFileName: String,     // ชื่อไฟล์ผลการตรวจสอบ
    resultFileType: String,     // ประเภทไฟล์ผลการตรวจสอบ
    resultFileSize: Number,     // ขนาดไฟล์ผลการตรวจสอบ
    resultStatus: { type: String, enum: ['pass', 'fail', 'pending'], default: 'pending' }, // สถานะผลการตรวจสอบ
    resultAddedAt: Date,        // วันที่เพิ่มผลการตรวจสอบ
    resultAddedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' }, // ผู้เพิ่มผลการตรวจสอบ
    resultNotes: String         // หมายเหตุเพิ่มเติม
  },
  default: null
})
result: Record<string, any>;
}

export const CandidateSchema = SchemaFactory.createForClass(Candidate);