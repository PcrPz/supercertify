// src/services/services.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from './schemas/service.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { FilesService } from '../files/files.service';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
    private readonly filesService: FilesService,
  ) {}

  // ดึงข้อมูลทั้งหมด
  async findAll(): Promise<Service[]> {
    return this.serviceModel.find().exec();
  }

  // ดึงข้อมูลตาม ID
  async findOne(id: string): Promise<Service> {
    try {
      if (typeof id !== 'string') {
        throw new BadRequestException('Service ID must be a string');
      }
      
      const service = await this.serviceModel.findById(id).exec();
      if (!service) {
        throw new NotFoundException(`Service with ID ${id} not found`);
      }
      return service;
    } catch (error) {
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid service ID format: ${id}`);
      }
      throw error;
    }
  }

  async checkDuplicateTitle(title: string, excludeId?: string): Promise<boolean> {
    const query: any = { Service_Title: title };
    
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const count = await this.serviceModel.countDocuments(query).exec();
    return count > 0;
  }

  // สร้างข้อมูลใหม่พร้อมรูปภาพ
  async create(createServiceDto: CreateServiceDto, file?: Express.Multer.File): Promise<Service> {
    try {
      // ตรวจสอบชื่อซ้ำ
      const isDuplicate = await this.checkDuplicateTitle(createServiceDto.Service_Title);
      if (isDuplicate) {
        throw new ConflictException(`Service with title '${createServiceDto.Service_Title}' already exists`);
      }
      
      // ตรวจสอบว่า RequiredDocuments เป็น array
      if (!Array.isArray(createServiceDto.RequiredDocuments) || createServiceDto.RequiredDocuments.length === 0) {
        throw new BadRequestException('RequiredDocuments must be a non-empty array');
      }
      
      // ถ้ามีไฟล์ ให้อัปโหลดไปที่ MinIO
      if (file) {
        try {
          const folder = 'services';
          const uploadResult = await this.filesService.uploadFile(file, folder);
          createServiceDto.Service_Image = uploadResult.filename;
        } catch (error) {
          console.error('Error uploading service image:', error);
          throw new BadRequestException('Failed to upload service image');
        }
      }
      
      // สร้าง service ใหม่
      const newService = new this.serviceModel(createServiceDto);
      return newService.save();
    } catch (error) {
      console.error('Error in create service:', error);
      
      // ถ้ามีการอัปโหลดไฟล์แล้วเกิดข้อผิดพลาด ให้ลบไฟล์นั้นออก
      if (createServiceDto.Service_Image) {
        try {
          await this.filesService.deleteFile(createServiceDto.Service_Image);
        } catch (deleteError) {
          console.error('Error deleting service image after failed creation:', deleteError);
        }
      }
      
      throw error;
    }
  }

  // อัปเดตข้อมูลพร้อมรูปภาพ
  async update(id: string, updateServiceDto: UpdateServiceDto, file?: Express.Multer.File): Promise<Service> {
    // ตรวจสอบว่า Service มีอยู่หรือไม่
    const existingService = await this.serviceModel.findById(id).exec();
    if (!existingService) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
    
    // ถ้ามีการอัปเดตชื่อ ให้ตรวจสอบชื่อซ้ำ
    if (updateServiceDto.Service_Title) {
      const isDuplicate = await this.checkDuplicateTitle(updateServiceDto.Service_Title, id);
      if (isDuplicate) {
        throw new ConflictException(`Service with title '${updateServiceDto.Service_Title}' already exists`);
      }
    }
    
   // เก็บชื่อไฟล์เดิมไว้ (ในกรณีที่ต้องลบทีหลัง)
  let oldImagePath: string | null = null; // เปลี่ยนประเภทเป็น string | null
  
    // ถ้ามีไฟล์ใหม่
    if (file) {
      try {
        // เก็บชื่อไฟล์เดิมไว้
        oldImagePath = existingService.Service_Image;
        
        // อัปโหลดไฟล์ใหม่
        const folder = 'services';
        const uploadResult = await this.filesService.uploadFile(file, folder);
        updateServiceDto.Service_Image = uploadResult.filename;
      } catch (error) {
        console.error('Error uploading new service image:', error);
        throw new BadRequestException('Failed to upload new service image');
      }
    }
    
    try {
      // อัปเดตข้อมูลใน database
      const updatedService = await this.serviceModel
        .findByIdAndUpdate(id, updateServiceDto, { new: true })
        .exec();
      
      // ตรวจสอบว่าอัปเดตสำเร็จหรือไม่
      if (!updatedService) {
        throw new NotFoundException(`Service with ID ${id} not found after update`);
      }
      
      // ลบไฟล์เก่าหลังจากอัปเดตสำเร็จ (ถ้ามีการอัปโหลดไฟล์ใหม่)
      if (file && oldImagePath) {
        try {
          await this.filesService.deleteFile(oldImagePath);
        } catch (deleteError) {
          console.error('Error deleting old service image:', deleteError);
        }
      }
      
      return updatedService;
    } catch (error) {
      // ถ้าอัปเดตไม่สำเร็จแต่มีการอัปโหลดไฟล์ใหม่ ให้ลบไฟล์ใหม่ออก
      if (file && updateServiceDto.Service_Image) {
        try {
          await this.filesService.deleteFile(updateServiceDto.Service_Image);
        } catch (deleteError) {
          console.error('Error deleting new service image after failed update:', deleteError);
        }
      }
      
      throw error;
    }
  }

  // ลบข้อมูลพร้อมรูปภาพ
  async remove(id: string): Promise<void> {
    const service = await this.serviceModel.findById(id).exec();
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
    
    // ลบไฟล์รูปภาพถ้ามี
    if (service.Service_Image) {
      try {
        await this.filesService.deleteFile(service.Service_Image);
      } catch (error) {
        console.error(`Error deleting service image for service ${id}:`, error);
      }
    }
    
    // ลบข้อมูลจาก database
    const result = await this.serviceModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Service with ID ${id} not found during deletion`);
    }
  }
}