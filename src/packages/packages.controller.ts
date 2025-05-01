// src/packages/packages.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, HttpStatus, HttpCode } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { Package } from './schemas/package.schema';

@Controller('api/packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  findAll(): Promise<Package[]> {
    return this.packagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Package> {
    return this.packagesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPackageDto: CreatePackageDto): Promise<Package> {
    return this.packagesService.create(createPackageDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updatePackageDto: UpdatePackageDto,
  ): Promise<Package> {
    return this.packagesService.update(id, updatePackageDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.packagesService.remove(id);
  }

  // Endpoints เพิ่มเติมสำหรับจัดการความสัมพันธ์กับ Service

  @Post(':id/services/:serviceId')
  addServiceToPackage(
    @Param('id') packageId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<Package> {
    return this.packagesService.addServiceToPackage(packageId, serviceId);
  }

  @Delete(':id/services/:serviceId')
  removeServiceFromPackage(
    @Param('id') packageId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<Package> {
    return this.packagesService.removeServiceFromPackage(packageId, serviceId);
  }
}
