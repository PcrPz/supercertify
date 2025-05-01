import { Controller, Get, Post, Body, Param, Put, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './schemas/order.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { UpdatePaymentDto, UpdatePaymentStatusDto } from 'src/orders/dto/update-payment.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/enum/role.enum';


@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createOrderDto: CreateOrderDto, @Request() req): Promise<Order> {
    return this.ordersService.create(createOrderDto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  findAll(): Promise<Order[]> {
    return this.ordersService.findAll();
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  findMyOrders(@Request() req): Promise<Order[]> {
    return this.ordersService.findByUserId(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Request() req): Promise<Order> {
    const order = await this.ordersService.findOne(id);
    
    if (req.user.role !== Role.Admin && order.user._id.toString() !== req.user.userId) {
      throw new ForbiddenException('You do not have permission to access this order');
    }
    
    return order;
  }

  // เพิ่ม endpoint สำหรับอัปเดตข้อมูลการชำระเงิน
  @Post(':id/payment')
  @UseGuards(JwtAuthGuard)
  async updatePayment(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,  // ต้องแน่ใจว่า import มาจากที่ถูกต้อง
    @Request() req
  ): Promise<Order> {
    console.log('Received payment data:', updatePaymentDto); // เพิ่ม log เพื่อตรวจสอบข้อมูล
    
    const order = await this.ordersService.findOne(id);
    
    // ตรวจสอบสิทธิ์
    if (req.user.role !== Role.Admin && order.user._id.toString() !== req.user.userId) {
      throw new ForbiddenException('You do not have permission to update payment for this order');
    }
    
    return this.ordersService.updatePayment(id, updatePaymentDto, req.user.userId);
  }

  // เพิ่ม endpoint สำหรับตรวจสอบสถานะการชำระเงิน
  @Get(':id/payment-status')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(
    @Param('id') id: string,
    @Request() req
  ): Promise<any> {
    const order = await this.ordersService.findOne(id);
    
    // ตรวจสอบสิทธิ์
    if (req.user.role !== Role.Admin && order.user._id.toString() !== req.user.userId) {
      throw new ForbiddenException('You do not have permission to view payment status for this order');
    }
    
    return {
      orderId: id,
      paymentMethod: order.paymentInfo?.paymentMethod,
      status: order.paymentInfo?.paymentStatus || 'awaiting_payment',
      orderStatus: order.OrderStatus,
      updatedAt: order.paymentInfo?.paymentUpdatedAt
    };
  }

  // เพิ่ม endpoint สำหรับแอดมินอัปเดตสถานะการชำระเงิน
  @Put(':id/payment-status')
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Roles(Role.Admin)  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
    @Request() req
  ): Promise<Order> {
    return this.ordersService.updatePaymentStatus(id, updatePaymentStatusDto.paymentStatus, req.user.userId);
  }
}