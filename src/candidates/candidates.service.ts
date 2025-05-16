// src/candidates/candidates.service.ts
import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Candidate, CandidateDocument } from './schemas/candidate.schema';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { OrdersService } from '../orders/orders.service';
import { UploadResultDto } from './dto/upload-result.dto';
import { randomUUID } from 'crypto';
import { FilesService } from 'src/files/files.service';

@Injectable()
export class CandidatesService {
  constructor(
    @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>,
    @Inject(forwardRef(() => OrdersService)) private ordersService: OrdersService,
    private filesService: FilesService,
  ) {}

  async create(createCandidateDto: CreateCandidateDto): Promise<Candidate> {
    const newCandidate = new this.candidateModel(createCandidateDto);
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
    const updatedCandidate = await this.candidateModel
      .findByIdAndUpdate(id, updateCandidateDto, { new: true })
      .populate('services')
      .exec();
    
    if (!updatedCandidate) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }
    
    return updatedCandidate;
  }

  async remove(id: string): Promise<any> {
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

  async findByOrderId(orderId: string): Promise<Candidate[]> {
    try {
      // ดึงข้อมูล Order ก่อน - ใช้ findOne ตามที่มีใน OrdersService
      const order = await this.ordersService.findOne(orderId);
      
      if (!order) {
        throw new NotFoundException(`Order with ID ${orderId} not found`);
      }
      
      // ถ้า order.candidates ถูก populate แล้ว (เป็น Object แทนที่จะเป็น ID)
      if (order.candidates && Array.isArray(order.candidates) && order.candidates.length > 0 && 
          typeof order.candidates[0] !== 'string' && typeof order.candidates[0] === 'object') {
        return order.candidates;
      }
      
      // ถ้ายังไม่ได้ populate ให้ค้นหา Candidates ตาม ID ที่อยู่ใน order.candidates
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

async uploadResultFile(
  id: string, 
  file: Express.Multer.File, 
  uploadResultDto: UploadResultDto,
  userId: string
): Promise<Candidate> {
  const candidate = await this.findOne(id);
  
  if (!candidate) {
    throw new NotFoundException(`Candidate with ID ${id} not found`);
  }
  
  // เปลี่ยนชื่อไฟล์ให้ขึ้นต้นด้วย "BackgroundCheck_" ตามด้วยชื่อ candidate
  const candidateName = candidate.C_FullName.replace(/\s+/g, '_'); // แทนที่ช่องว่างด้วย "_"
  const fileExtension = file.originalname.split('.').pop(); // ดึงนามสกุลไฟล์
  const customFileName = `BackgroundCheck_${candidateName}.${fileExtension}`;
  
  // อัปโหลดไฟล์ไปยัง MinIO
  const folder = `results/${id}`;
  // เก็บ UUID ไว้ใน DB แต่ใช้ชื่อไฟล์ที่กำหนดเองสำหรับการแสดงผล
  const fileNameWithUUID = `${randomUUID()}-${customFileName}`;
  
  const uploadResult = await this.filesService.uploadFile(file, folder, fileNameWithUUID);
  const fileUrl = await this.filesService.getFile(`${folder}/${fileNameWithUUID}`);
  
  // อัปเดตข้อมูล Candidate
  const resultData = {
    resultFile: fileUrl,
    // บันทึกชื่อไฟล์ที่ต้องการแสดงให้ผู้ใช้เห็น
    resultFileName: customFileName,
    resultFileType: file.mimetype,
    resultFileSize: file.size,
    resultStatus: uploadResultDto.resultStatus || 'pending',
    resultAddedAt: new Date(),
    resultAddedBy: userId,
    resultNotes: uploadResultDto.resultNotes || ''
  };
  
  // อัปเดตข้อมูล Candidate
  const savedCandidate = await this.candidateModel.findByIdAndUpdate(
    id,
    { result: resultData },
    { new: true }
  ).exec();
  
  if (!savedCandidate) {
    throw new NotFoundException(`Failed to update candidate with ID ${id}`);
  }
  
  // ตรวจสอบว่าทุก Candidate ในคำสั่งมีผลการตรวจสอบแล้วหรือไม่
  // หาคำสั่งที่ Candidate นี้อยู่
  const orders = await this.ordersService.findAll();
  for (const order of orders) {
    if (order.candidates.some(c => c._id.toString() === id)) {
      await this.checkAndUpdateOrderStatus(order._id.toString());
      break;
    }
  }
  
  return savedCandidate;
}

// เมธอดเพื่อตรวจสอบว่าทุก Candidate ในคำสั่งมีผลการตรวจสอบแล้วหรือไม่
private async checkAndUpdateOrderStatus(orderId: string): Promise<void> {
  // ดึงข้อมูล Order
  const order = await this.ordersService.findOne(orderId);
  
  // ดึงข้อมูล Candidates ทั้งหมดในคำสั่ง
  const candidates = await this.candidateModel.find({
    _id: { $in: order.candidates }
  }).exec();
  
  // ตรวจสอบว่าทุก Candidate มีผลการตรวจสอบแล้วหรือไม่
  const allHaveResults = candidates.every(candidate => candidate.result !== null);
  
  // ถ้าทุก Candidate มีผลการตรวจสอบแล้ว ให้อัปเดตสถานะของคำสั่งเป็น completed
  if (allHaveResults && candidates.length > 0) {
    await this.ordersService.updateOrderStatus(orderId, 'completed');
  }
}

// เพิ่มเมธอดนี้เพื่อดึงข้อมูล Candidates พร้อมข้อมูลผลการตรวจสอบตาม Order
async findByOrderIdWithResults(orderId: string): Promise<Candidate[]> {
  const order = await this.ordersService.findOne(orderId);
  
  if (!order) {
    throw new NotFoundException(`Order with ID ${orderId} not found`);
  }
  
  // ดึงข้อมูล Candidates ทั้งหมดในคำสั่ง
  return this.candidateModel.find({
    _id: { $in: order.candidates }
  })
  .populate('result.resultAddedBy')
  .exec();
}
}