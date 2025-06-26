
// src/candidates/candidates.module.ts - แบบมี forwardRef สำหรับ ServicesModule
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { Candidate, CandidateSchema } from './schemas/candidate.schema';
import { OrdersModule } from '../orders/orders.module';
import { FilesModule } from '../files/files.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Candidate.name, schema: CandidateSchema },
    ]),
    forwardRef(() => OrdersModule),
    FilesModule,
    forwardRef(() => ServicesModule), // ✅ ใช้ forwardRef ถ้ามี circular dependency
  ],
  controllers: [CandidatesController],
  providers: [CandidatesService],
  exports: [CandidatesService],
})
export class CandidatesModule {}