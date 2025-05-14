// src/documents/documents.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentFile, DocumentSchema } from './schemas/document.schema';
import { FilesModule } from '../files/files.module';
import { CandidatesModule } from '../candidates/candidates.module';
import { ServicesModule } from '../services/services.module'; // เพิ่มบรรทัดนี้

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentFile.name, schema: DocumentSchema },
    ]),
    FilesModule,
    CandidatesModule,
    ServicesModule // เพิ่มบรรทัดนี้
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService]
})
export class DocumentsModule {}