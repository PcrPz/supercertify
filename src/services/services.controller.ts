// src/services/services.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, HttpStatus, HttpCode, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { Service } from './schemas/service.schema';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enum/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from 'src/files/files.service';

@Controller('api/services')
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly filesService: FilesService
  ) {}

  @Get()
  async findAll(): Promise<Service[]> {
    const services = await this.servicesService.findAll();
    
    // แปลงชื่อไฟล์เป็น URL สำหรับทุก service
    for (const service of services) {
      if (service.Service_Image) {
        try {
          service.Service_Image = await this.filesService.getFile(service.Service_Image);
        } catch (error) {
          console.error(`Failed to get image URL for service ${service._id}:`, error);
        }
      }
    }
    
    return services;
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Service> {
    const service = await this.servicesService.findOne(id);
    
    // แปลงชื่อไฟล์เป็น URL
    if (service.Service_Image) {
      try {
        service.Service_Image = await this.filesService.getFile(service.Service_Image);
      } catch (error) {
        console.error(`Failed to get image URL for service ${service._id}:`, error);
      }
    }
    
    return service;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  @UseInterceptors(FileInterceptor('service_image'))
  async create(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Service> {
    try {
      // แปลง RequiredDocuments อย่างถูกต้อง
      let requiredDocuments;
      if (body.RequiredDocuments) {
        if (typeof body.RequiredDocuments === 'string') {
          try {
            requiredDocuments = JSON.parse(body.RequiredDocuments);
          } catch (parseError) {
            throw new BadRequestException('Invalid JSON format for RequiredDocuments');
          }
        } else {
          requiredDocuments = body.RequiredDocuments;
        }
      } else {
        throw new BadRequestException('RequiredDocuments is required');
      }

      // ตรวจสอบว่า requiredDocuments เป็น array และไม่ว่าง
      if (!Array.isArray(requiredDocuments) || requiredDocuments.length === 0) {
        throw new BadRequestException('RequiredDocuments must be a non-empty array');
      }

      const createServiceDto: CreateServiceDto = {
        Service_Title: body.Service_Title,
        Service_Desc: body.Service_Desc || '',
        Price: Number(body.Price),
        RequiredDocuments: requiredDocuments
      };

      const createdService = await this.servicesService.create(createServiceDto, file);
      
      // แปลง Service_Image เป็น URL
      if (createdService.Service_Image) {
        try {
          createdService.Service_Image = await this.filesService.getFile(createdService.Service_Image);
        } catch (error) {
          console.error(`Failed to get image URL for new service:`, error);
        }
      }
      
      return createdService;
    } catch (error) {
      console.error('Error in create service:', error);
      throw error;
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  @UseInterceptors(FileInterceptor('service_image'))
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Service> {
    try {
      // แปลง RequiredDocuments
      const updateServiceDto: UpdateServiceDto = { ...body };
      
      // แปลง Price เป็น number
      if (body.Price) {
        updateServiceDto.Price = Number(body.Price);
      }
      
      // แปลง RequiredDocuments
      if (body.RequiredDocuments) {
        if (typeof body.RequiredDocuments === 'string') {
          updateServiceDto.RequiredDocuments = JSON.parse(body.RequiredDocuments);
        } else {
          updateServiceDto.RequiredDocuments = body.RequiredDocuments;
        }
      }
      
      // อัปเดต service
      const updatedService = await this.servicesService.update(id, updateServiceDto, file);
      
      // แปลง Service_Image เป็น URL
      if (updatedService.Service_Image) {
        try {
          updatedService.Service_Image = await this.filesService.getFile(updatedService.Service_Image);
        } catch (error) {
          console.error(`Failed to get image URL for updated service:`, error);
        }
      }
      
      return updatedService;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadRequestException('Invalid JSON format for RequiredDocuments');
      }
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  remove(@Param('id') id: string): Promise<void> {
    return this.servicesService.remove(id);
  }
}