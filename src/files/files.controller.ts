// src/files/files.controller.ts
import { Body, Controller, Get, Param, Post, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesService, UploadResult } from './files.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';


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

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // รองรับได้สูงสุด 10 ไฟล์
  uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
    @Body('filenames') customFilenames?: string[]
  ): Promise<UploadResult[]> {
    return this.service.uploadMultipleFiles(files, folder, customFilenames);
  }
}