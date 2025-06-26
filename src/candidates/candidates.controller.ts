// src/candidates/candidates.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  Request, 
  ForbiddenException, 
  BadRequestException 
} from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { UploadServiceResultDto } from './dto/upload-service-result.dto';
import { UploadSummaryResultDto } from './dto/upload-summary-result.dto';
import { UploadResultDto } from './dto/upload-result.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enum/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrdersService } from 'src/orders/orders.service';

@Controller('api/candidates')
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly ordersService: OrdersService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createCandidateDto: CreateCandidateDto) {
    return this.candidatesService.create(createCandidateDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  findAll() {
    return this.candidatesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.candidatesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateCandidateDto: UpdateCandidateDto) {
    return this.candidatesService.update(id, updateCandidateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  remove(@Param('id') id: string) {
    return this.candidatesService.remove(id);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  async findByOrderId(@Param('orderId') orderId: string) {
    return this.candidatesService.findByOrderId(orderId);
  }

  // ✅ NEW: อัปโหลดผลลัพธ์แยกตาม Service
  @Post(':candidateId/service/:serviceId/upload-result')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    })
  )
  async uploadServiceResult(
    @Param('candidateId') candidateId: string,
    @Param('serviceId') serviceId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadServiceResultDto: UploadServiceResultDto,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.candidatesService.uploadServiceResult(
      candidateId,
      serviceId,
      file,
      uploadServiceResultDto,
      req.user.userId
    );
  }

  // ✅ NEW: อัปโหลดผลลัพธ์รวม (Summary)
  @Post(':candidateId/upload-summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    })
  )
  async uploadSummaryResult(
    @Param('candidateId') candidateId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadSummaryResultDto: UploadSummaryResultDto,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.candidatesService.uploadSummaryResult(
      candidateId,
      file,
      uploadSummaryResultDto,
      req.user.userId
    );
  }

  // ✅ NEW: ดูผลลัพธ์ทั้งหมดของ Candidate
  @Get(':candidateId/results')
  @UseGuards(JwtAuthGuard)
  async getCandidateResults(
    @Param('candidateId') candidateId: string,
    @Request() req
  ) {
    return this.candidatesService.getCandidateResults(candidateId, req.user);
  }

  // ✅ NEW: ดูผลลัพธ์ของ Service เฉพาะ
  @Get(':candidateId/service/:serviceId/result')
  @UseGuards(JwtAuthGuard)
  async getServiceResult(
    @Param('candidateId') candidateId: string,
    @Param('serviceId') serviceId: string,
    @Request() req
  ) {
    return this.candidatesService.getServiceResult(candidateId, serviceId, req.user);
  }

  // ✅ NEW: ลบผลลัพธ์ของ Service เฉพาะ
  @Delete(':candidateId/service/:serviceId/result')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async deleteServiceResult(
    @Param('candidateId') candidateId: string,
    @Param('serviceId') serviceId: string
  ) {
    return this.candidatesService.deleteServiceResult(candidateId, serviceId);
  }

  // ✅ NEW: ลบผลลัพธ์รวม (Summary)
  @Delete(':candidateId/summary-result')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async deleteSummaryResult(@Param('candidateId') candidateId: string) {
    return this.candidatesService.deleteSummaryResult(candidateId);
  }

  // ✅ NEW: ดาวน์โหลดไฟล์ผลลัพธ์
  @Get(':candidateId/service/:serviceId/download')
  @UseGuards(JwtAuthGuard)
  async downloadServiceResult(
    @Param('candidateId') candidateId: string,
    @Param('serviceId') serviceId: string,
    @Request() req
  ) {
    const result = await this.candidatesService.getServiceResult(candidateId, serviceId, req.user);
    return {
      downloadUrl: result.resultFile,
      fileName: result.resultFileName
    };
  }

  // ✅ NEW: ดาวน์โหลดไฟล์สรุป
  @Get(':candidateId/download-summary')
  @UseGuards(JwtAuthGuard)
  async downloadSummaryResult(
    @Param('candidateId') candidateId: string,
    @Request() req
  ) {
    const results = await this.candidatesService.getCandidateResults(candidateId, req.user);
    
    if (!results.summaryResult) {
      throw new BadRequestException('No summary result found');
    }
    
    return {
      downloadUrl: results.summaryResult.resultFile,
      fileName: results.summaryResult.resultFileName
    };
  }

  // ✅ LEGACY: เก็บ endpoint เก่าไว้ backward compatibility
  @Post(':id/upload-result')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    })
  )
  async uploadResultFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadResultDto: UploadResultDto,
    @Request() req
  ) {
    console.warn('⚠️ Legacy endpoint used. Please use new service-specific endpoints.');
    return this.candidatesService.uploadResultFile(id, file, uploadResultDto, req.user.userId);
  }

  @Get('order/:orderId/results')
  @UseGuards(JwtAuthGuard)
  async findByOrderIdWithResults(
    @Param('orderId') orderId: string,
    @Request() req
  ) {
    const order = await this.ordersService.findOne(orderId);
    
    if (
      !req.user.roles.includes(Role.Admin) && 
      order.user._id.toString() !== req.user.userId
    ) {
      throw new ForbiddenException('You do not have permission to access these results');
    }
    
    return this.candidatesService.findByOrderIdWithResults(orderId);
  }
}