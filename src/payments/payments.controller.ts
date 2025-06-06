// src/payments/payments.controller.ts - Fixed Version
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, ForbiddenException, NotFoundException,BadRequestException ,UseInterceptors, UploadedFile  } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto, UpdatePaymentStatusDto } from './dto/update-payment.dto';
import { Payment } from './schemas/payment.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/enum/role.enum';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from '../files/files.service';
import { User } from 'src/decorators/user.decorator';

@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('receipt'))
  async create(
    @Body() body: any,
    @UploadedFile() receipt: Express.Multer.File,
    @User() user
  ): Promise<Payment> {
    // ตรวจสอบว่า order มีอยู่จริง
    const order = await this.orderModel.findById(body.orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${body.orderId} not found`);
    }
    
    // ตรวจสอบสิทธิ์
    const orderUserId = order.user ? order.user.toString() : null;
    if (!user.roles.includes(Role.Admin) && order.user._id.toString() !== user.userId) {
      throw new ForbiddenException('You do not have permission to create payment for this order');
    }
    
    // สร้าง DTO จาก body
    const createPaymentDto: CreatePaymentDto = {
      paymentMethod: body.paymentMethod,
      orderId: body.orderId,
      transferInfo: {
        name: body['transferInfo.name'],
        date: body['transferInfo.date'],
        amount: body['transferInfo.amount'],
        reference: body['transferInfo.reference'],
        receiptUrl: undefined
      }
    };
    
    // ✅ จัดการการอัปโหลดไฟล์ - แก้ไขแล้ว
    if (receipt) {
      try {
        console.log('📁 Uploading receipt file:', {
          originalname: receipt.originalname,
          mimetype: receipt.mimetype,
          size: receipt.size
        });
        
        // ✅ ระบุ folder สำหรับ receipt
        const uploadResult = await this.filesService.uploadFile(receipt, 'receipts');
        
        console.log('✅ Upload result:', {
          filename: uploadResult.filename,
          url: uploadResult.url,
          etag: uploadResult.etag
        });
        
        // ✅ ใช้ URL จาก uploadResult แทน
        const receiptUrl = uploadResult.url;
        
        console.log('🔗 Final receipt URL:', receiptUrl);
        
        if (createPaymentDto.transferInfo) {
          createPaymentDto.transferInfo.receiptUrl = receiptUrl;
        }
      } catch (error) {
        console.error('❌ Failed to upload receipt:', error);
        // ถ้าอัปโหลดไม่ได้ ให้ continue ต่อไปโดยไม่มี receipt
      }
    } else {
      console.log('⚠️ No receipt file provided');
    }
    
    console.log('💾 Creating payment with data:', createPaymentDto);
    
    // สร้างการชำระเงินในฐานข้อมูล
    return this.paymentsService.create(createPaymentDto, user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  findAll(): Promise<Payment[]> {
    return this.paymentsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @Request() req
  ): Promise<Payment> {
    const payment = await this.paymentsService.findOne(id);
    const order = await this.orderModel.findById(payment.order);
    
    if (!order) {
      throw new NotFoundException('Associated order not found');
    }
    
    const orderUserId = order.user ? order.user.toString() : null;
    
    if (req.user.role !== Role.Admin && orderUserId !== req.user.userId) {
      throw new ForbiddenException('You do not have permission to view this payment');
    }
    
    return payment;
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  async findByOrderId(
    @Param('orderId') orderId: string,
    @Request() req
  ): Promise<Payment[]> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    
    const orderUserId = order.user ? order.user.toString() : null;
    
    if (req.user.role !== Role.Admin && orderUserId !== req.user.userId) {
      throw new ForbiddenException('You do not have permission to view payments for this order');
    }
    
    return this.paymentsService.findByOrderId(orderId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Request() req
  ): Promise<Payment> {
    const payment = await this.paymentsService.findOne(id);
    const order = await this.orderModel.findById(payment.order);
    
    if (!order) {
      throw new NotFoundException('Associated order not found');
    }
    
    const orderUserId = order.user ? order.user.toString() : null;
    
    if (req.user.role !== Role.Admin && orderUserId !== req.user.userId) {
      throw new ForbiddenException('You do not have permission to update this payment');
    }
    
    return this.paymentsService.update(id, updatePaymentDto, req.user.userId);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  updateStatus(
    @Param('id') id: string,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
    @Request() req
  ): Promise<Payment> {
    return this.paymentsService.updatePaymentStatus(id, updatePaymentStatusDto.paymentStatus, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  remove(@Param('id') id: string): Promise<void> {
    return this.paymentsService.remove(id);
  }
}