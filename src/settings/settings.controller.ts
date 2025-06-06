// src/settings/settings.controller.ts - แก้ไขจากโค้ดเดิมของคุณ
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile,
  Req,
  BadRequestException
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enum/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from '../files/files.service';

@Controller('api/settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly filesService: FilesService
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async findAll() {
    try {
      const settings = await this.settingsService.findAll();
      return {
        success: true,
        data: settings
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  @Get('group/:group')
  @UseGuards(JwtAuthGuard)
  async findByGroup(@Param('group') group: string) {
    try {
      const settings = await this.settingsService.findByGroup(group);
      return {
        success: true,
        data: settings
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // ✅ เปลี่ยนจาก findByKey ให้เป็น public สำหรับ payment_methods
  @Get(':key')
  async findByKey(@Param('key') key: string) {
    try {
      if (key === 'payment_methods') {
        const paymentMethods = await this.settingsService.getFormattedPaymentMethods();
        return paymentMethods;
      }

      const setting = await this.settingsService.findByKey(key);
      
      if (!setting) {
        return {
          success: false,
          message: 'Setting not found'
        };
      }

      return {
        success: true,
        data: setting.value
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async create(@Body() data: any, @Req() req: any) {
    try {
      const userId = req.user?._id || req.user?.id;
      const result = await this.settingsService.create(data, userId);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // ✅ ปรับ PUT endpoint ให้รับแค่ JSON (เอา form-data ออก)
  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async update(
    @Param('key') key: string, 
    @Body() data: any,
    @Req() req?: any
  ) {
    try {
      console.log('🔄 Updating setting:', key);
      
      const userId = req?.user?._id || req?.user?.id || 'system';
      
      // ✅ ไม่ต้องจัดการ JSON parsing และ file upload ที่นี่แล้ว
      const result = await this.settingsService.update(key, data, userId);
      return result;
    } catch (error) {
      console.error('❌ Error updating setting:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  @Delete(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async delete(@Param('key') key: string, @Req() req: any) {
    try {
      const userId = req.user?._id || req.user?.id;
      const result = await this.settingsService.delete(key, userId);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  @Post(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async createOrUpdate(
    @Param('key') key: string,
    @Body() data: any,
    @Req() req: any
  ) {
    try {
      const userId = req.user?._id || req.user?.id;
      const result = await this.settingsService.createOrUpdate(key, data, userId);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  // ✅ ทำให้ upload-qr เป็น endpoint หลัก (ไม่ใช่แค่สำรอง)
  @Post(':key/upload-qr')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @UseInterceptors(FileInterceptor('qr_image'))
  async uploadQrCode(
    @Param('key') key: string,
    @UploadedFile() qrImage: Express.Multer.File,
    @Req() req: any
  ) {
    try {
      console.log('📁 Uploading QR code for setting:', key);
      
      if (!qrImage) {
        return {
          success: false,
          message: 'No QR code image provided'
        };
      }

      if (key !== 'payment_methods') {
        return {
          success: false,
          message: 'QR upload is only supported for payment_methods setting'
        };
      }

      // Validate file
      if (qrImage.size > 5 * 1024 * 1024) {
        return {
          success: false,
          message: 'File size too large (max 5MB)'
        };
      }

      if (!qrImage.mimetype.startsWith('image/')) {
        return {
          success: false,
          message: 'Only image files are allowed'
        };
      }
      
      const uploadResult = await this.filesService.uploadFile(qrImage, 'payments/qr-codes');
      
      // Get existing setting
      const existingSetting = await this.settingsService.findByKey(key);
      
      if (!existingSetting) {
        return {
          success: false,
          message: 'Payment methods setting not found'
        };
      }
      
      const settingData = { ...existingSetting.value };
      
      // ตรวจสอบและสร้าง qr_payment object
      if (!settingData.qr_payment) {
        settingData.qr_payment = {
          enabled: true,
          account_name: '',
          account_number: '',
          description: 'ชำระเงินผ่าน QR Code พร้อมเพย์'
        };
      }
      
      // อัปเดต QR image URL
      settingData.qr_payment.qr_image = uploadResult.url;
      
      const userId = req.user?._id || req.user?.id;
      await this.settingsService.update(key, settingData, userId);
      
      return {
        success: true,
        message: 'QR code uploaded successfully',
        qr_image_url: uploadResult.url,
        // ✅ ส่งข้อมูลทั้งหมดกลับด้วย
        data: settingData
      };
    } catch (error) {
      console.error('❌ Failed to upload QR code:', error);
      return {
        success: false,
        message: 'Failed to upload QR code: ' + error.message
      };
    }
  }

  // Validate setting data - เก็บไว้เหมือนเดิม
  @Post(':key/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async validateSetting(
    @Param('key') key: string,
    @Body() data: any
  ) {
    try {
      if (key === 'payment_methods') {
        const validation = this.settingsService.validatePaymentMethods(data);
        return {
          success: true,
          valid: validation.valid,
          errors: validation.errors || []
        };
      }
      
      return {
        success: true,
        valid: true,
        errors: []
      };
    } catch (error) {
      return {
        success: false,
        message: 'Validation failed: ' + error.message
      };
    }
  }
}