// src/candidates/candidates.service.ts
import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Candidate, CandidateDocument } from './schemas/candidate.schema';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class CandidatesService {
  constructor(
    @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>,
    @Inject(forwardRef(() => OrdersService)) private ordersService: OrdersService
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
}