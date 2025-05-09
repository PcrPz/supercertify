// src/files/files.module.ts
import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Module({
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService], // เพิ่ม export เพื่อให้โมดูลอื่นเข้าถึงได้
})
export class FilesModule {}