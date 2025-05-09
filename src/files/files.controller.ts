// src/files/files.controller.ts
import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FilesService, UploadResult } from './files.service'; // เพิ่ม import UploadResult
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('files')
export class FilesController {
  constructor(readonly service: FilesService) {}

  @Get('buckets')
  bucketsList() {
    return this.service.bucketsList();
  }

  @Get('file-url/:name')
  getFile(@Param('name') name: string) {
    return this.service.getFile(name);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile('file') file: Express.Multer.File,
  ): Promise<UploadResult> { // ระบุ return type ให้ชัดเจน
    return this.service.uploadFile(file);
  }
}