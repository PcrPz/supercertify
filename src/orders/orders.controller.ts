// src/orders/orders.controller.ts
import { Controller, Get, Post,Delete, Body, Param, Put, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './schemas/order.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/enum/role.enum';
import { User } from 'src/decorators/user.decorator';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createOrderDto: CreateOrderDto, @Request() req): Promise<Order> {
    return this.ordersService.create(createOrderDto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  async findOne(@Param('id') id: string, @User() user): Promise<Order> {
    const order = await this.ordersService.findOne(id);
    if ( !user.roles.includes(Role.Admin) && order.user._id.toString() !== user.userId) {
      throw new ForbiddenException('You do not have permission to access this order');
    }
    
    return order;
  }


    // Delete an order
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteOrder(@Param('id') id: string, @User() user): Promise<any> {
    const order = await this.ordersService.findOne(id);
    
    // Check if user has permission to delete this order
    if (!user.roles.includes(Role.Admin) && order.user._id.toString() !== user.userId) {
      throw new ForbiddenException('You do not have permission to delete this order');
    }
    
    // Check if order is in a state that allows deletion
    if (order.OrderStatus !== 'awaiting_payment') {
      throw new ForbiddenException('Orders can only be deleted when in "awaiting_payment" status');
    }
    
    return this.ordersService.deleteOrder(id);
  }

  // Get payment status of an order
  @Get(':id/payment-status')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(@Param('id') id: string, @Request() req): Promise<any> {
    const order = await this.ordersService.findOne(id);
    
    if (req.user.role !== Role.Admin && order.user._id.toString() !== req.user.userId) {
      throw new ForbiddenException('You do not have permission to view payment status for this order');
    }
    
    return {
      orderId: id,
      orderStatus: order.OrderStatus,
      payment: order.payment
    };
  }

  // Update order status (admin only)
  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string
  ): Promise<Order> {
    return this.ordersService.updateOrderStatus(id, status);
  }
}