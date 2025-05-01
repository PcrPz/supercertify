// src/packages/packages.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Package, PackageDocument } from './schemas/package.schema';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(
    @InjectModel(Package.name) private packageModel: Model<PackageDocument>,
  ) {}

  // ดึงข้อมูลทั้งหมด พร้อม populate ข้อมูล services
  async findAll(): Promise<Package[]> {
    return this.packageModel.find().populate('services').exec();
  }

  // ดึงข้อมูลตาม ID
  async findOne(id: string): Promise<Package> {
    const pack = await this.packageModel.findById(id).populate('services').exec();
    if (!pack) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }
    return pack;
  }

 // ตรวจสอบว่ามี Package ที่มี title ซ้ำหรือไม่
 async checkDuplicateTitle(title: string, excludeId?: string): Promise<boolean> {
  const query: any = { Package_Title: title };
  
  // ถ้ามี excludeId จะไม่ตรวจสอบ document ที่มี ID นั้น (ใช้ในกรณีอัปเดต)
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const count = await this.packageModel.countDocuments(query).exec();
  return count > 0;
}

  // สร้างข้อมูลใหม่
  async create(createPackageDto: CreatePackageDto): Promise<Package> {
    // ตรวจสอบชื่อซ้ำ
    const isDuplicate = await this.checkDuplicateTitle(createPackageDto.Package_Title);
    if (isDuplicate) {
      throw new ConflictException(`Package with title '${createPackageDto.Package_Title}' already exists`);
    }
    
    const newPackage = new this.packageModel(createPackageDto);
    return newPackage.save();
  }

  // อัปเดตข้อมูล
  async update(id: string, updatePackageDto: UpdatePackageDto): Promise<Package> {
    // ถ้ามีการอัปเดตชื่อ ให้ตรวจสอบชื่อซ้ำ
    if (updatePackageDto.Package_Title) {
      const isDuplicate = await this.checkDuplicateTitle(updatePackageDto.Package_Title, id);
      if (isDuplicate) {
        throw new ConflictException(`Package with title '${updatePackageDto.Package_Title}' already exists`);
      }
    }
    
    const updatedPackage = await this.packageModel
      .findByIdAndUpdate(id, updatePackageDto, { new: true })
      .populate('services')
      .exec();
    
    if (!updatedPackage) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }
    
    return updatedPackage;
  }


  // ลบข้อมูล
  async remove(id: string): Promise<void> {
    const result = await this.packageModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Package with ID ${id} not found`);
    }
  }

  // เพิ่ม service เข้าไปใน package
  async addServiceToPackage(packageId: string, serviceId: string): Promise<Package> {
    const updatedPackage = await this.packageModel
      .findByIdAndUpdate(
        packageId,
        { $addToSet: { services: serviceId } }, // $addToSet ป้องกันการเพิ่มซ้ำ
        { new: true }
      )
      .populate('services')
      .exec();
    
    if (!updatedPackage) {
      throw new NotFoundException(`Package with ID ${packageId} not found`);
    }
    
    return updatedPackage;
  }

  // ลบ service ออกจาก package
  async removeServiceFromPackage(packageId: string, serviceId: string): Promise<Package> {
    const updatedPackage = await this.packageModel
      .findByIdAndUpdate(
        packageId,
        { $pull: { services: serviceId } },
        { new: true }
      )
      .populate('services')
      .exec();
    
    if (!updatedPackage) {
      throw new NotFoundException(`Package with ID ${packageId} not found`);
    }
    
    return updatedPackage;
  }
}