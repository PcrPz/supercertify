// src/packages/packages.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, HttpStatus, HttpCode, UseGuards } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { Package } from './schemas/package.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enum/role.enum';

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
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  create(@Body() createPackageDto: CreatePackageDto): Promise<Package> {
    return this.packagesService.create(createPackageDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  update(
    @Param('id') id: string,
    @Body() updatePackageDto: UpdatePackageDto,
  ): Promise<Package> {
    return this.packagesService.update(id, updatePackageDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  remove(@Param('id') id: string): Promise<void> {
    return this.packagesService.remove(id);
  }

  // Endpoints เพิ่มเติมสำหรับจัดการความสัมพันธ์กับ Service
  @Post(':id/services/:serviceId')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  addServiceToPackage(
    @Param('id') packageId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<Package> {
    return this.packagesService.addServiceToPackage(packageId, serviceId);
  }

  @Delete(':id/services/:serviceId')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  removeServiceFromPackage(
    @Param('id') packageId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<Package> {
    return this.packagesService.removeServiceFromPackage(packageId, serviceId);
  }
}