// src/candidates/candidates.service.ts
import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Candidate, CandidateDocument, ServiceResult, SummaryResult } from './schemas/candidate.schema';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { UploadServiceResultDto } from './dto/upload-service-result.dto';
import { UploadSummaryResultDto } from './dto/upload-summary-result.dto';
import { UploadResultDto } from './dto/upload-result.dto';
import { CandidateResultsResponseDto } from './dto/candidate-results-response.dto';
import { OrdersService } from '../orders/orders.service';
import { ServicesService } from '../services/services.service';
import { randomUUID } from 'crypto';
import { FilesService } from 'src/files/files.service';
import { Role } from 'src/enum/role.enum';

@Injectable()
export class CandidatesService {
  constructor(
    @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>,
    @Inject(forwardRef(() => OrdersService)) private ordersService: OrdersService,
    private filesService: FilesService,
    private servicesService: ServicesService,
  ) {}

  // ✅ Basic CRUD methods
  // ✅ แก้ไข create method
  async create(createCandidateDto: CreateCandidateDto): Promise<Candidate> {
    const normalizedData = this.normalizeNameFields(createCandidateDto);
    const newCandidate = new this.candidateModel(normalizedData);
    return newCandidate.save();
  }

  async findAll(): Promise<Candidate[]> {
    return this.candidateModel.find().populate('services').exec();
  }

  async findOne(id: string): Promise<Candidate> {
    const candidate = await this.candidateModel.findById(id).populate('services').exec();
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }
    return candidate;
  }

  async update(id: string, updateCandidateDto: UpdateCandidateDto): Promise<Candidate> {
    const normalizedData = this.normalizeNameFields(updateCandidateDto);
    
    const updatedCandidate = await this.candidateModel
      .findByIdAndUpdate(id, normalizedData, { new: true })
      .populate('services')
      .exec();
    
    if (!updatedCandidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }
    
    return updatedCandidate;
  }

  async remove(id: string): Promise<any> {
    const candidate = await this.findOne(id);
    
    // ลบไฟล์ผลลัพธ์ทั้งหมด
    await this.deleteAllCandidateResultFiles(candidate);
    
    const result = await this.candidateModel.deleteOne({ _id: id }).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }
    
    return {
      success: true,
      message: 'Candidate deleted successfully',
      deletedCount: result.deletedCount
    };
  }

  // ✅ NEW: อัปโหลดผลลัพธ์แยกตาม Service
  async uploadServiceResult(
    candidateId: string,
    serviceId: string,
    file: Express.Multer.File,
    uploadServiceResultDto: UploadServiceResultDto,
    userId: string
  ): Promise<Candidate> {
    console.log(`📄 Uploading service result for candidate ${candidateId}, service ${serviceId}`);
    
    // 1. ตรวจสอบ Candidate
    const candidate = await this.findOne(candidateId);
    
    // 2. ตรวจสอบ Service
    const service = await this.servicesService.findOne(serviceId);
    
    // 3. ตรวจสอบว่า Candidate มี Service นี้หรือไม่
    const hasService = candidate.services.some(s => s._id.toString() === serviceId);
    if (!hasService) {
      throw new BadRequestException(`Candidate does not have service "${service.Service_Title}"`);
    }
    
    // 4. สร้างชื่อไฟล์แยกตาม Service
    const candidateName = this.sanitizeFileName(`${candidate.C_FirstName}_${candidate.C_LastName}`);
    const serviceName = this.sanitizeFileName(service.Service_Title);
    const fileExtension = file.originalname.split('.').pop();
    const customFileName = `BackgroundCheck_${candidateName}_${serviceName}.${fileExtension}`;
    
    // 5. ลบไฟล์เก่าถ้ามี
    const existingResultIndex = candidate.serviceResults.findIndex(
      r => r.serviceId.toString() === serviceId
    );
    
    if (existingResultIndex >= 0) {
      const oldResult = candidate.serviceResults[existingResultIndex];
      await this.deleteResultFile(oldResult.resultFile);
    }
    
    // 6. อัปโหลดไฟล์ใหม่
    const folder = `results/${candidateId}/services`;
    const fileNameWithUUID = `${randomUUID()}-${customFileName}`;
    const uploadResult = await this.filesService.uploadFile(file, folder, fileNameWithUUID);
    
    // 7. สร้างข้อมูล Service Result
    const serviceResultData: ServiceResult = {
      serviceId: serviceId as any,
      serviceName: service.Service_Title,
      resultFile: uploadResult.url,
      resultFileName: customFileName,
      resultFileType: file.mimetype,
      resultFileSize: file.size,
      resultStatus: uploadServiceResultDto.resultStatus || 'pending',
      resultAddedAt: new Date(),
      resultAddedBy: userId as any,
      resultNotes: uploadServiceResultDto.resultNotes || ''
    };
    
    // 8. อัปเดตหรือเพิ่ม Service Result
    if (existingResultIndex >= 0) {
      candidate.serviceResults[existingResultIndex] = serviceResultData;
    } else {
      candidate.serviceResults.push(serviceResultData);
    }
    
    const savedCandidate = await this.candidateModel.findByIdAndUpdate(
      candidateId,
      { serviceResults: candidate.serviceResults },
      { new: true }
    ).populate('services').exec();
    
    if (!savedCandidate) {
      throw new NotFoundException(`Failed to update candidate with ID ${candidateId}`);
    }
    
    if (!savedCandidate) {
      throw new NotFoundException(`Failed to update candidate with ID ${candidateId}`);
    }
    
    // 9. ตรวจสอบการเสร็จสิ้นของ Order
    await this.checkAndUpdateOrderStatus(candidateId);
    
    console.log(`✅ Service result uploaded successfully for ${service.Service_Title}`);
    return savedCandidate;
  }

  // ✅ NEW: อัปโหลดผลลัพธ์รวม (Summary)
  async uploadSummaryResult(
    candidateId: string,
    file: Express.Multer.File,
    uploadSummaryResultDto: UploadSummaryResultDto,
    userId: string
  ): Promise<Candidate> {
    console.log(`📄 Uploading summary result for candidate ${candidateId}`);
    
    const candidate = await this.findOne(candidateId);
    
    // ลบไฟล์ summary เก่าถ้ามี
    if (candidate.summaryResult) {
      await this.deleteResultFile(candidate.summaryResult.resultFile);
    }
    
    // สร้างชื่อไฟล์ Summary
    const candidateName = this.sanitizeFileName(`${candidate.C_FirstName}_${candidate.C_LastName}`);
    const fileExtension = file.originalname.split('.').pop();
    const customFileName = `BackgroundCheck_${candidateName}_Summary.${fileExtension}`;
    
    // อัปโหลดไฟล์
    const folder = `results/${candidateId}/summary`;
    const fileNameWithUUID = `${randomUUID()}-${customFileName}`;
    const uploadResult = await this.filesService.uploadFile(file, folder, fileNameWithUUID);
    
    // สร้างข้อมูล Summary Result
    const summaryResultData: SummaryResult = {
      resultFile: uploadResult.url,
      resultFileName: customFileName,
      resultFileType: file.mimetype,
      resultFileSize: file.size,
      overallStatus: uploadSummaryResultDto.overallStatus || 'pending',
      resultAddedAt: new Date(),
      resultAddedBy: userId as any,
      resultNotes: uploadSummaryResultDto.resultNotes || ''
    };
    
    // อัปเดต Candidate
    const updatedCandidate = await this.candidateModel.findByIdAndUpdate(
      candidateId,
      { summaryResult: summaryResultData },
      { new: true }
    ).populate('services').exec();
    
    if (!updatedCandidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }
    
    // ตรวจสอบการเสร็จสิ้นของ Order
    await this.checkAndUpdateOrderStatus(candidateId);
    
    console.log(`✅ Summary result uploaded successfully`);
    return updatedCandidate;
  }

  // ✅ NEW: ดูผลลัพธ์ทั้งหมดของ Candidate
  async getCandidateResults(candidateId: string, user: any): Promise<CandidateResultsResponseDto> {
    const candidate = await this.candidateModel.findById(candidateId)
      .populate('services')
      .populate('serviceResults.resultAddedBy', 'email')
      .populate('summaryResult.resultAddedBy', 'email')
      .exec();
    
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }
    
    // ตรวจสอบสิทธิ์
    await this.checkCandidateAccess(candidateId, user);
    
    // สร้าง response
    const services = candidate.services.map(service => {
      const serviceResult = candidate.serviceResults.find(
        r => r.serviceId.toString() === service._id.toString()
      );
      
      return {
        serviceId: service._id.toString(),
        serviceName: service.Service_Title,
        hasResult: !!serviceResult,
        result: serviceResult ? {
          serviceId: serviceResult.serviceId.toString(),
          serviceName: serviceResult.serviceName,
          resultFile: serviceResult.resultFile,
          resultFileName: serviceResult.resultFileName,
          resultFileType: serviceResult.resultFileType,
          resultFileSize: serviceResult.resultFileSize,
          resultStatus: serviceResult.resultStatus,
          resultAddedAt: serviceResult.resultAddedAt,
          resultAddedBy: (serviceResult.resultAddedBy as any)?.email || 'Unknown',
          resultNotes: serviceResult.resultNotes
        } : undefined
      };
    });
    
    const completedServices = services.filter(s => s.hasResult).length;
    const totalServices = services.length;
    const hasAllServiceResults = completedServices === totalServices;
    const hasSummaryResult = !!candidate.summaryResult;
    const isComplete = hasAllServiceResults && hasSummaryResult;
    
    const totalFiles = totalServices + 1; // services + summary
    const completedFiles = completedServices + (hasSummaryResult ? 1 : 0);
    const completionPercentage = Math.round((completedFiles / totalFiles) * 100);
    
    return {
      candidateId: candidate._id.toString(),
      candidateName: `${candidate.C_FirstName} ${candidate.C_LastName}`.trim(),
      candidateEmail: candidate.C_Email || '',
      services,
      summaryResult: candidate.summaryResult ? {
        resultFile: candidate.summaryResult.resultFile,
        resultFileName: candidate.summaryResult.resultFileName,
        resultFileType: candidate.summaryResult.resultFileType,
        resultFileSize: candidate.summaryResult.resultFileSize,
        overallStatus: candidate.summaryResult.overallStatus,
        resultAddedAt: candidate.summaryResult.resultAddedAt,
        resultAddedBy: (candidate.summaryResult.resultAddedBy as any)?.email || 'Unknown',
        resultNotes: candidate.summaryResult.resultNotes
      } : undefined,
      isComplete,
      completionPercentage,
      totalFiles,
      completedFiles
    };
  }

  // ✅ NEW: ดูผลลัพธ์ของ Service เฉพาะ
  async getServiceResult(candidateId: string, serviceId: string, user: any): Promise<any> {
    const candidate = await this.findOne(candidateId);
    
    // ตรวจสอบสิทธิ์
    await this.checkCandidateAccess(candidateId, user);
    
    const serviceResult = candidate.serviceResults.find(
      r => r.serviceId.toString() === serviceId
    );
    
    if (!serviceResult) {
      throw new NotFoundException(`No result found for service ${serviceId}`);
    }
    
    return serviceResult;
  }

  // ✅ NEW: ลบผลลัพธ์ของ Service เฉพาะ
  async deleteServiceResult(candidateId: string, serviceId: string): Promise<Candidate> {
    const candidate = await this.findOne(candidateId);
    
    const resultIndex = candidate.serviceResults.findIndex(
      r => r.serviceId.toString() === serviceId
    );
    
    if (resultIndex === -1) {
      throw new NotFoundException(`No result found for service ${serviceId}`);
    }
    
    // ลบไฟล์
    const resultToDelete = candidate.serviceResults[resultIndex];
    await this.deleteResultFile(resultToDelete.resultFile);
    
    // ลบจาก array
    const updatedServiceResults = candidate.serviceResults.filter(
      r => r.serviceId.toString() !== serviceId
    );
    
    const savedCandidate = await this.candidateModel.findByIdAndUpdate(
      candidateId,
      { serviceResults: updatedServiceResults },
      { new: true }
    ).populate('services').exec();
    
    if (!savedCandidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }
    
    // ตรวจสอบสถานะ Order ใหม่
    await this.checkAndUpdateOrderStatus(candidateId);
    
    console.log(`🗑️ Deleted service result for service ${serviceId}`);
    return savedCandidate;
  }

  // ✅ NEW: ลบผลลัพธ์รวม (Summary)
  async deleteSummaryResult(candidateId: string): Promise<Candidate> {
    const candidate = await this.findOne(candidateId);
    
    if (!candidate.summaryResult) {
      throw new NotFoundException('No summary result found');
    }
    
    // ลบไฟล์
    await this.deleteResultFile(candidate.summaryResult.resultFile);
    
    // ลบ summary result
    const updatedCandidate = await this.candidateModel.findByIdAndUpdate(
      candidateId,
      { summaryResult: null },
      { new: true }
    ).populate('services').exec();
    
    if (!updatedCandidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }
    
    // ตรวจสอบสถานะ Order ใหม่
    await this.checkAndUpdateOrderStatus(candidateId);
    
    console.log(`🗑️ Deleted summary result`);
    return updatedCandidate;
  }

  // ✅ Helper Methods
  private sanitizeFileName(name: string): string {
    // รองรับทั้ง FullName และ FirstName + LastName
    const displayName = name || 'Unknown';
    
    return displayName
      .trim()
      .replace(/[^a-zA-Z0-9ก-๙\s_]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30);
  }

  private async checkCandidateAccess(candidateId: string, user: any): Promise<void> {
    // ถ้าเป็น Admin ให้ผ่านเลย
    if (user.roles && user.roles.includes(Role.Admin)) {
      return;
    }
    
    // หา Order ที่มี Candidate นี้
    const orders = await this.ordersService.findByUserId(user.userId);
    const hasAccess = orders.some(order => 
      order.candidates.some(c => c._id.toString() === candidateId)
    );
    
    if (!hasAccess) {
      throw new ForbiddenException('You do not have permission to access this candidate');
    }
  }

  private async deleteResultFile(fileUrl: string): Promise<void> {
    try {
      if (fileUrl && fileUrl.includes('/files/static/')) {
        const urlParts = fileUrl.split('/files/static/');
        if (urlParts.length > 1) {
          await this.filesService.deleteFile(urlParts[1]);
          console.log(`🗑️ Deleted result file: ${urlParts[1]}`);
        }
      }
    } catch (error) {
      console.error('Failed to delete result file:', error);
    }
  }

  private async deleteAllCandidateResultFiles(candidate: Candidate): Promise<void> {
    // ลบ service results
    for (const serviceResult of candidate.serviceResults) {
      await this.deleteResultFile(serviceResult.resultFile);
    }
    
    // ลบ summary result
    if (candidate.summaryResult) {
      await this.deleteResultFile(candidate.summaryResult.resultFile);
    }
    
    // ลบ legacy result
    if (candidate.result?.resultFile) {
      await this.deleteResultFile(candidate.result.resultFile);
    }
  }

  private async checkAndUpdateOrderStatus(candidateId: string): Promise<void> {
    try {
      // หา Order ที่มี Candidate นี้ (optimized query)
      const orders = await this.ordersService.findOrdersByCandidate(candidateId);
      
      for (const order of orders) {
        const allCandidatesComplete = await this.checkAllCandidatesComplete(order.candidates);
        
        if (allCandidatesComplete && order.OrderStatus !== 'completed') {
          await this.ordersService.updateOrderStatus(order._id.toString(), 'completed');
          console.log(`✅ Order ${order._id} marked as completed`);
        } else if (!allCandidatesComplete && order.OrderStatus === 'completed') {
          await this.ordersService.updateOrderStatus(order._id.toString(), 'processing');
          console.log(`⏳ Order ${order._id} reverted to processing`);
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  }

  private async checkAllCandidatesComplete(candidateIds: any[]): Promise<boolean> {
    const candidates = await this.candidateModel.find({
      _id: { $in: candidateIds }
    }).populate('services').exec();
    
    return candidates.every(candidate => {
      // ตรวจสอบว่าทุก Service มีผลแล้วหรือไม่
      const allServicesHaveResults = candidate.services.every(service => {
        return candidate.serviceResults.some(result => 
          result.serviceId.toString() === service._id.toString()
        );
      });
      
      // ตรวจสอบว่ามี Summary Result หรือไม่
      const hasSummaryResult = candidate.summaryResult !== null;
      
      return allServicesHaveResults && hasSummaryResult;
    });
  }

  // ✅ Legacy methods (backward compatibility)
  async findByOrderId(orderId: string): Promise<Candidate[]> {
    try {
      const order = await this.ordersService.findOne(orderId);
      
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }
      
      if (order.candidates && Array.isArray(order.candidates) && order.candidates.length > 0 && 
          typeof order.candidates[0] !== 'string' && typeof order.candidates[0] === 'object') {
        return order.candidates;
      }
      
      return this.candidateModel.find({
        _id: { $in: order.candidates }
      }).populate('services').exec();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Error finding candidates: ${error.message}`);
    }
  }

  async findByOrderIdWithResults(orderId: string): Promise<Candidate[]> {
    const order = await this.ordersService.findOne(orderId);
    
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }
    
    return this.candidateModel.find({
      _id: { $in: order.candidates }
    })
    .populate('services')
    .populate('serviceResults.resultAddedBy', 'email')
    .populate('summaryResult.resultAddedBy', 'email')
    .exec();
  }

  // ✅ Legacy: เก็บไว้ backward compatibility
  async uploadResultFile(
    id: string, 
    file: Express.Multer.File, 
    uploadResultDto: UploadResultDto,
    userId: string
  ): Promise<Candidate> {
    console.warn('⚠️ Using legacy uploadResultFile method. Consider using new service-specific methods.');
    
    const candidate = await this.findOne(id);
    
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }
    
    const candidateName = this.sanitizeFileName(`${candidate.C_FirstName}_${candidate.C_LastName}`);
    const fileExtension = file.originalname.split('.').pop();
    const customFileName = `BackgroundCheck_${candidateName}_Legacy.${fileExtension}`;
    
    const folder = `results/${id}/legacy`;
    const fileNameWithUUID = `${randomUUID()}-${customFileName}`;
    
    const uploadResult = await this.filesService.uploadFile(file, folder, fileNameWithUUID);
    const fileUrl = uploadResult.url;
    
    const resultData = {
      resultFile: fileUrl,
      resultFileName: customFileName,
      resultFileType: file.mimetype,
      resultFileSize: file.size,
      resultStatus: uploadResultDto.resultStatus || 'pending',
      resultAddedAt: new Date(),
      resultAddedBy: userId,
      resultNotes: uploadResultDto.resultNotes || ''
    };
    
    const savedCandidate = await this.candidateModel.findByIdAndUpdate(
      id,
      { result: resultData },
      { new: true }
    ).exec();
    
    if (!savedCandidate) {
      throw new NotFoundException(`Failed to update candidate with ID ${id}`);
    }
    
    await this.checkAndUpdateOrderStatus(id);
    
    return savedCandidate;
  }
    private normalizeNameFields(candidateData: any): any {
    const normalized = { ...candidateData };

    // ถ้ามี FirstName และ LastName แต่ไม่มี FullName
    if (normalized.C_FirstName && normalized.C_LastName && !normalized.C_FullName) {
      normalized.C_FullName = `${normalized.C_FirstName} ${normalized.C_LastName}`.trim();
    }
    
    // ถ้ามี FullName แต่ไม่มี FirstName และ LastName
    if (normalized.C_FullName && (!normalized.C_FirstName || !normalized.C_LastName)) {
      const parts = normalized.C_FullName.split(' ');
      if (!normalized.C_FirstName) {
        normalized.C_FirstName = parts[0] || '';
      }
      if (!normalized.C_LastName) {
        normalized.C_LastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
      }
    }

    return normalized;
  }
  
}