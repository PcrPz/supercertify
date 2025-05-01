// src/candidates/candidates.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Candidate, CandidateDocument } from './schemas/candidate.schema';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

@Injectable()
export class CandidatesService {
  constructor(
    @InjectModel(Candidate.name) private candidateModel: Model<CandidateDocument>,
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

  async remove(id: string): Promise<void> {
    const result = await this.candidateModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Candidate with ID ${id} not found`);
    }
  }

  async findByOrderId(orderId: string): Promise<Candidate[]> {
    // หมายเหตุ: ใช้วิธีนี้เมื่อมี Order ที่อ้างอิงถึง Candidate
    // ถ้า candidates เก็บใน order แทน ให้ใช้การ populate แทน
    return this.candidateModel.find({ order: orderId }).populate('services').exec();
  }
}