// src/files/files.controller.ts - Simple Version
import { 
  Controller, 
  Get, 
  Param, 
  Res, 
  NotFoundException,
  Post,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors
} from '@nestjs/common';
import { FilesService, UploadResult } from './files.service';
import { Response } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Controller('files')
export class FilesController {
  constructor(readonly service: FilesService) {}

  // ✅ ลองใช้แบบนี้ก่อน - Simple route
  @Get('static/:folder/:filename')
  async serveSimpleFile(
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    const filePath = `${folder}/${filename}`;
    return this.serveFile(filePath, res);
  }

  // ✅ สำหรับ nested folders
  @Get('static/:folder/:subfolder/:filename')
  async serveNestedFile(
    @Param('folder') folder: string,
    @Param('subfolder') subfolder: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    const filePath = `${folder}/${subfolder}/${filename}`;
    return this.serveFile(filePath, res);
  }

  // ✅ สำหรับ deep nested folders
  @Get('static/:folder/:sub1/:sub2/:filename')
  async serveDeepFile(
    @Param('folder') folder: string,
    @Param('sub1') sub1: string,
    @Param('sub2') sub2: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    const filePath = `${folder}/${sub1}/${sub2}/${filename}`;
    return this.serveFile(filePath, res);
  }

  // ✅ สำหรับ 4 levels (documents/candidateId/serviceId/documentType/file.pdf)
  @Get('static/:folder/:sub1/:sub2/:sub3/:filename')
  async serveVeryDeepFile(
    @Param('folder') folder: string,
    @Param('sub1') sub1: string,
    @Param('sub2') sub2: string,
    @Param('sub3') sub3: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    const filePath = `${folder}/${sub1}/${sub2}/${sub3}/${filename}`;
    return this.serveFile(filePath, res);
  }
  private async serveFile(filePath: string, res: Response) {
    try {
      console.log('Serving file:', filePath); // Debug log
      
      const fileStream = await this.service.getFileStream(filePath);
      
      res.set({
        'Content-Type': this.getContentType(filePath),
        'Cache-Control': 'public, max-age=31536000',
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('File not found:', filePath, error.message);
      throw new NotFoundException('File not found');
    }
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
    };
    
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  @Get('buckets')
  bucketsList() {
    return this.service.bucketsList();
  }

  @Get('file-url/:name')
  getFile(@Param('name') name: string) {
    return this.service.getPresignedUrl(name);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile('file') file: Express.Multer.File,
  ): Promise<UploadResult> {
    return this.service.uploadFile(file);
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('folder') folder?: string,
    @Body('filenames') customFilenames?: string[]
  ): Promise<UploadResult[]> {
    return this.service.uploadMultipleFiles(files, folder, customFilenames);
  }
}