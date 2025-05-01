// src/payments/payments.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from '../orders/dto/update-payment.dto';
import { Payment } from './schemas/payment.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from '../orders/orders.service';
import { Role } from 'src/enum/role.enum';
import { Roles } from 'src/decorators/roles.decorator';

@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req
  ): Promise<Payment> {
    // ตรวจสอบว่าผู้ใช้มีสิทธิ์สร้าง payment สำหรับ order นี้
    const order = await this.ordersService.findOne(createPaymentDto.orderId);
    if (req.user.role !== Role.Admin && order.user?.toString() !== req.user.userId) {
      throw new ForbiddenException('You do not have permission to create payment for this order');
    }
    
    return this.paymentsService.create(createPaymentDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
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
    const order = await this.ordersService.findOne(payment.order.toString());
    
    // ตรวจสอบสิทธิ์
    if (req.user.role !== Role.Admin && order.user?.toString() !== req.user.userId) {
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
    // ตรวจสอบสิทธิ์
    const order = await this.ordersService.findOne(orderId);
    if (req.user.role !== Role.Admin && order.user?.toString() !== req.user.userId) {
      throw new ForbiddenException('You do not have permission to view payments for this order');
    }
    
    return this.paymentsService.findByOrderId(orderId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ): Promise<Payment> {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  remove(@Param('id') id: string): Promise<void> {
    return this.paymentsService.remove(id);
  }
}