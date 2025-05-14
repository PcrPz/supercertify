// src/documents/documents.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Param, 
  Body, 
  UseInterceptors, 
  UploadedFile,
  UploadedFiles, // เพิ่ม import นี้ 
  UseGuards, 
  Request,
  ForbiddenException
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'; 
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enum/role.enum';

@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload-multiple')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 10, { // รองรับได้สูงสุด 10 ไฟล์
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max size per file
      },
    })
  )
  async uploadMultipleDocuments(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadDocumentDto: UploadDocumentDto,
    @Request() req
  ) {
    return this.documentsService.uploadMultipleDocuments(files, uploadDocumentDto);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max size
      },
    })
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @Request() req
  ) {
    // สามารถเพิ่มการตรวจสอบสิทธิ์เพิ่มเติมได้ที่นี่
    return this.documentsService.uploadDocument(file, uploadDocumentDto);
  }

  @Get('candidate/:candidateId/service/:serviceId')
  @UseGuards(JwtAuthGuard)
  async getDocumentsByCandidateAndService(
    @Param('candidateId') candidateId: string,
    @Param('serviceId') serviceId: string,
    @Request() req
  ) {
    // สามารถเพิ่มการตรวจสอบสิทธิ์เพิ่มเติมได้ที่นี่
    return this.documentsService.getDocumentsByCandidateAndService(candidateId, serviceId);
  }

  @Get('candidate/:candidateId')
  @UseGuards(JwtAuthGuard)
  async getAllCandidateDocuments(
    @Param('candidateId') candidateId: string,
    @Request() req
  ) {
    // สามารถเพิ่มการตรวจสอบสิทธิ์เพิ่มเติมได้ที่นี่
    return this.documentsService.getAllCandidateDocuments(candidateId);
  }

  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async verifyDocument(
    @Param('id') id: string,
    @Request() req
  ) {
    return this.documentsService.verifyDocument(id, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteDocument(
    @Param('id') id: string,
    @Request() req
  ) {
    // สามารถเพิ่มการตรวจสอบสิทธิ์เพิ่มเติมได้ที่นี่
    return this.documentsService.deleteDocument(id);
  }
  
  @Get('candidate/:candidateId/documents')
  @UseGuards(JwtAuthGuard)
  async getDocumentsByCandidate(
    @Param('candidateId') candidateId: string,
    @Request() req
  ) {
    return this.documentsService.getDocumentsByCandidate(candidateId);
  }
  
  @Get('candidate/:candidateId/missing')
  @UseGuards(JwtAuthGuard)
  async getMissingDocuments(
    @Param('candidateId') candidateId: string,
    @Request() req
  ) {
    return this.documentsService.getMissingDocuments(candidateId);
  }
}