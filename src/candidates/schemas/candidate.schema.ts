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
}

export const CandidateSchema = SchemaFactory.createForClass(Candidate);