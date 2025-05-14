// src/services/services.service.ts
import { Injectable, NotFoundException, ConflictException ,BadRequestException} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from './schemas/service.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  // ดึงข้อมูลทั้งหมด
  async findAll(): Promise<Service[]> {
    return this.serviceModel.find().exec();
  }

  // ดึงข้อมูลตาม ID
// src/services/services.service.ts
async findOne(id: string): Promise<Service> {
  try {
    // ตรวจสอบว่า id เป็น string หรือไม่
    if (typeof id !== 'string') {
      throw new BadRequestException('Service ID must be a string');
    }
    
    const service = await this.serviceModel.findById(id).exec();
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
    return service;
  } catch (error) {
    // ถ้าเป็น CastError (ID ไม่ถูกต้องตามรูปแบบ ObjectId)
    if (error.name === 'CastError') {
      throw new BadRequestException(`Invalid service ID format: ${id}`);
    }
    throw error;
  }
}

  async checkDuplicateTitle(title: string, excludeId?: string): Promise<boolean> {
    const query: any = { Service_Title: title };
    
    // ถ้ามี excludeId จะไม่ตรวจสอบ document ที่มี ID นั้น (ใช้ในกรณีอัปเดต)
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const count = await this.serviceModel.countDocuments(query).exec();
    return count > 0;
  }

  // สร้างข้อมูลใหม่
  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    // ตรวจสอบชื่อซ้ำ
    const isDuplicate = await this.checkDuplicateTitle(createServiceDto.Service_Title);
    if (isDuplicate) {
      throw new ConflictException(`Service with title '${createServiceDto.Service_Title}' already exists`);
    }
    
    const newService = new this.serviceModel(createServiceDto);
    return newService.save();
  }

  // อัปเดตข้อมูล
  async update(id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
    // ถ้ามีการอัปเดตชื่อ ให้ตรวจสอบชื่อซ้ำ
    if (updateServiceDto.Service_Title) {
      const isDuplicate = await this.checkDuplicateTitle(updateServiceDto.Service_Title, id);
      if (isDuplicate) {
        throw new ConflictException(`Service with title '${updateServiceDto.Service_Title}' already exists`);
      }
    }
    
    const updatedService = await this.serviceModel
      .findByIdAndUpdate(id, updateServiceDto, { new: true })
      .exec();
    
    if (!updatedService) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
    
    return updatedService;
  }

  // ลบข้อมูล
  async remove(id: string): Promise<void> {
    const result = await this.serviceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
  }
}