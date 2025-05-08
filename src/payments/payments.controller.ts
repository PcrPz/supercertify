// src/payments/payments.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
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

@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req
  ): Promise<Payment> {
    // Check if user has permission to create payment for this order
    const order = await this.orderModel.findById(createPaymentDto.orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    
    // Safe navigation - check if user exists and convert to string
    const orderUserId = order.user ? order.user.toString() : null;
    
    if (req.user.role !== Role.Admin && orderUserId !== req.user.userId) {
      throw new ForbiddenException('You do not have permission to create payment for this order');
    }
    
    return this.paymentsService.create(createPaymentDto, req.user.userId);
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
    
    // Safe navigation - check if user exists and convert to string
    const orderUserId = order.user ? order.user.toString() : null;
    
    // Check permissions
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
    // Check permissions
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    
    // Safe navigation - check if user exists and convert to string
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
    
    // Safe navigation - check if user exists and convert to string
    const orderUserId = order.user ? order.user.toString() : null;
    
    // Check permissions
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