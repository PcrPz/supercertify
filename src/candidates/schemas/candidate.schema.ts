import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Service } from '../../services/schemas/service.schema';

export type CandidateDocument = Candidate & Document;

export interface ServiceResult {
  serviceId: MongooseSchema.Types.ObjectId;
  serviceName: string;
  resultFile: string;
  resultFileName: string;
  resultFileType: string;
  resultFileSize: number;
  resultStatus: 'pass' | 'fail' | 'pending';
  resultAddedAt: Date;
  resultAddedBy: MongooseSchema.Types.ObjectId;
  resultNotes?: string;
}

export interface SummaryResult {
  resultFile: string;
  resultFileName: string;
  resultFileType: string;
  resultFileSize: number;
  overallStatus: 'pass' | 'fail' | 'pending';
  resultAddedAt: Date;
  resultAddedBy: MongooseSchema.Types.ObjectId;
  resultNotes?: string;
}

@Schema({ timestamps: true })
export class Candidate {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: any;

  // ✅ เปลี่ยนจาก C_FullName เป็น FirstName + LastName
  @Prop({ required: true })
  C_FirstName: string;

  @Prop({ required: true })
  C_LastName: string;

  @Prop()
  C_Email: string;

  @Prop()
  C_Company_Name: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Service' }] })
  services: Service[];
  
  @Prop({
    type: [{
      serviceId: { type: MongooseSchema.Types.ObjectId, ref: 'Service', required: true },
      serviceName: { type: String, required: true },
      resultFile: { type: String, required: true },
      resultFileName: { type: String, required: true },
      resultFileType: { type: String, required: true },
      resultFileSize: { type: Number, required: true },
      resultStatus: { 
        type: String, 
        enum: ['pass', 'fail', 'pending'], 
        default: 'pending',
        required: true 
      },
      resultAddedAt: { type: Date, required: true },
      resultAddedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
      resultNotes: { type: String, default: '' }
    }],
    default: []
  })
  serviceResults: ServiceResult[];

  @Prop({
    type: {
      resultFile: { type: String, required: true },
      resultFileName: { type: String, required: true },
      resultFileType: { type: String, required: true },
      resultFileSize: { type: Number, required: true },
      overallStatus: { 
        type: String, 
        enum: ['pass', 'fail', 'pending'], 
        default: 'pending',
        required: true 
      },
      resultAddedAt: { type: Date, required: true },
      resultAddedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
      resultNotes: { type: String, default: '' }
    },
    default: null
  })
  summaryResult: SummaryResult | null;

  @Prop({
    type: {
      resultFile: String,
      resultFileName: String,
      resultFileType: String,
      resultFileSize: Number,
      resultStatus: { type: String, enum: ['pass', 'fail', 'pending'], default: 'pending' },
      resultAddedAt: Date,
      resultAddedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
      resultNotes: String
    },
    default: null
  })
  result: Record<string, any> | null;
}

export const CandidateSchema = SchemaFactory.createForClass(Candidate);

// Virtual property สำหรับ FullName
CandidateSchema.virtual('C_FullName').get(function(this: CandidateDocument) {
  return `${this.C_FirstName} ${this.C_LastName}`.trim();
});

CandidateSchema.set('toJSON', { virtuals: true });