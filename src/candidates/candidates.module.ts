// src/candidates/candidates.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CandidatesService } from './candidates.service';
import { CandidatesController } from './candidates.controller';
import { Candidate, CandidateSchema } from './schemas/candidate.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Candidate.name, schema: CandidateSchema },
    ]),
  ],
  controllers: [CandidatesController],
  providers: [CandidatesService],
  exports: [CandidatesService],
})
export class CandidatesModule {}