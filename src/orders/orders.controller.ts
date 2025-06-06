// src/orders/orders.controller.ts
import { Controller, Get, Post,Delete, Body, Param, Put, UseGuards, Request, ForbiddenException,NotFoundException,BadRequestException, Inject, forwardRef} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderDocument } from './schemas/order.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/enum/role.enum';
import { User } from 'src/decorators/user.decorator';
import { CandidatesService } from 'src/candidates/candidates.service';
import { CouponsService } from 'src/coupons/coupons.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Controller('api/orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    @Inject(forwardRef(() => CandidatesService)) private candidatesService: CandidatesService,
    private readonly couponsService: CouponsService, // เพิ่มบรรทัดนี้
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>, // เพิ่มบรรทัดนี้
  ) {}

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

    @Get('with-results-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getOrdersWithResultsStatus() {
    const orders = await this.ordersService.findAll();
    
    // เพิ่มข้อมูลเกี่ยวกับสถานะผลการตรวจสอบ
    const ordersWithStatus = await Promise.all(orders.map(async order => {
      // ดึงข้อมูล Candidates ทั้งหมดในคำสั่ง
      const candidates = await this.candidatesService.findByOrderIdWithResults(order._id.toString());
      
      // นับจำนวน Candidates ที่มีผลการตรวจสอบแล้ว
      const completedResults = candidates.filter(candidate => candidate.result !== null).length;
      
      // สถานะว่าครบหรือไม่
      const isComplete = completedResults === candidates.length && candidates.length > 0;
      
      return {
        ...JSON.parse(JSON.stringify(order)),
        resultStatus: {
          total: candidates.length,
          completed: completedResults,
          isComplete
        }
      };
    }));
    
    return ordersWithStatus;
  }
  @Get('reviewable')
  @UseGuards(JwtAuthGuard)
  async getReviewableOrders(@User() user): Promise<any> {
    try {
      const orders = await this.ordersService.findReviewableOrdersByUserId(user.userId);
      
      return {
        success: true,
        data: orders,
        message: 'Reviewable orders fetched successfully'
      };
    } catch (error) {
      console.error('Error getting reviewable orders:', error);
      throw new BadRequestException('ไม่สามารถดึงรายการคำสั่งซื้อที่สามารถรีวิวได้');
    }
  }

  @Get('count-by-user')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getOrderCountByUser() {
    try {
      const orders = await this.ordersService.findAll();
      
      // นับจำนวนคำสั่งซื้อตามผู้ใช้
      const orderCountByUser = {};
      orders.forEach(order => {
        if (order.user && order.user._id) {
          const userId = order.user._id.toString();
          orderCountByUser[userId] = (orderCountByUser[userId] || 0) + 1;
        }
      });
      
      return orderCountByUser;
    } catch (error) {
      console.error('Error counting orders by user:', error);
      throw new BadRequestException('ไม่สามารถนับจำนวนคำสั่งซื้อได้');
    }
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
    
    // Check permissions
    if (!user.roles.includes(Role.Admin) && order.user._id.toString() !== user.userId) {
      throw new ForbiddenException('You do not have permission to delete this order');
    }
    
    // ✅ เพิ่มการเตือนถ้ามีคูปอง
    if (order.coupon) {
      console.log(`⚠️ Order ${id} has coupon ${order.coupon}, will be released upon deletion`);
    }
    
    // Check if order can be deleted
    if (order.OrderStatus !== 'awaiting_payment') {
      throw new ForbiddenException('Orders can only be deleted when in "awaiting_payment" status');
    }
    
    const result = await this.ordersService.deleteOrder(id);
    
    // ✅ เพิ่มข้อมูลใน response
    return {
      ...result,
      message: result.couponReleased 
        ? 'Order deleted successfully and coupon has been released for reuse'
        : 'Order deleted successfully'
    };
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

  @Put(':id/complete-documents')
  @UseGuards(JwtAuthGuard)
  async completeDocuments(
    @Param('id') id: string,
    @User() user
  ): Promise<Order> {
    // ดึงข้อมูล order
    const order = await this.ordersService.findOne(id);
    
    // ตรวจสอบสิทธิ์
    if (order.user._id.toString() !== user.userId && !user.roles.includes(Role.Admin)) {
      throw new ForbiddenException('You do not have permission to update this order');
    }
    
    // ตรวจสอบสถานะปัจจุบัน
    if (order.OrderStatus !== 'payment_verified') {
      throw new ForbiddenException('Order status can only be updated to processing when current status is payment_verified');
    }
    
    // อัปเดทสถานะเป็น processing
    return this.ordersService.updateOrderStatus(id, 'processing');
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  findUserOrders(@Param('userId') userId: string): Promise<Order[]> {
    return this.ordersService.findByUserId(userId);
  }
  
  @Get('track/:trackingNumber')
  async findByTrackingNumber(@Param('trackingNumber') trackingNumber: string): Promise<Order> {
    return this.ordersService.findByTrackingNumber(trackingNumber);
  }

  @Get('public/track/:trackingNumber')
  async trackOrder(@Param('trackingNumber') trackingNumber: string): Promise<any> {
    try {
      const order = await this.ordersService.findByTrackingNumber(trackingNumber) as any;
      
      // เพิ่ม id field ให้ตรงกับที่ frontend คาดหวัง (ถ้า _id เป็น Object)
      if (order._id) {
        order.id = order._id.toString();
      }
      
      return order;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error tracking order');
    }
  }
@Post(':id/check-coupon')
@UseGuards(JwtAuthGuard)
async checkOrderCoupon(
  @Param('id') id: string,
  @Body() body: { couponCode: string },
  @User() user
) {
  const order = await this.ordersService.findOne(id);
  
  // ตรวจสอบสิทธิ์
  if (!user.roles.includes(Role.Admin) && order.user._id.toString() !== user.userId) {
    throw new ForbiddenException('You do not have permission to use coupon with this order');
  }
  
  // ตรวจสอบว่าคำสั่งซื้ออยู่ในสถานะที่ยังไม่ชำระเงิน
  if (order.OrderStatus !== 'awaiting_payment') {
    throw new BadRequestException('คูปองสามารถใช้ได้เฉพาะกับคำสั่งซื้อที่ยังไม่ชำระเงินเท่านั้น');
  }
  
  // คำนวณราคาหลังหักส่วนลดโปรโมชั่น
  const afterPromotionPrice = order.SubTotalPrice - (order.promotionDiscount || 0);
  
  try {
    // ตรวจสอบความถูกต้องของคูปอง
    const coupon = await this.couponsService.validateCoupon(
      body.couponCode, 
      afterPromotionPrice,
      user.userId
    );
    
    // คำนวณส่วนลด
    const discountAmount = this.couponsService.calculateDiscount(coupon, afterPromotionPrice);
    
    return {
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        description: coupon.description
      },
      discountAmount
    };
  } catch (error) {
    throw new BadRequestException(error.message);
  }
}


@Post(':id/apply-coupon')
@UseGuards(JwtAuthGuard)
async applyOrderCoupon(
  @Param('id') id: string,
  @Body() body: { couponCode: string },
  @User() user
) {
  const order = await this.ordersService.findOne(id);
  
  // ตรวจสอบสิทธิ์
  if (!user.roles.includes(Role.Admin) && order.user._id.toString() !== user.userId) {
    throw new ForbiddenException('You do not have permission to use coupon with this order');
  }
  
  // ตรวจสอบว่าคำสั่งซื้ออยู่ในสถานะที่ยังไม่ชำระเงิน
  if (order.OrderStatus !== 'awaiting_payment') {
    throw new BadRequestException('คูปองสามารถใช้ได้เฉพาะกับคำสั่งซื้อที่ยังไม่ชำระเงินเท่านั้น');
  }
  
  // คำนวณราคาหลังหักส่วนลดโปรโมชั่น
  const afterPromotionPrice = order.SubTotalPrice - (order.promotionDiscount || 0);
  
  try {
    // ตรวจสอบความถูกต้องของคูปอง
    const coupon = await this.couponsService.validateCoupon(
      body.couponCode, 
      afterPromotionPrice,
      user.userId
    );
    
    // คำนวณส่วนลด
    const discountAmount = this.couponsService.calculateDiscount(coupon, afterPromotionPrice);
    
    // มาร์คคูปองว่าถูกใช้แล้ว
    await this.couponsService.markAsUsed(coupon._id.toString(), id);
    
    // อัปเดตคำสั่งซื้อ
    const newTotalPrice = order.TotalPrice - discountAmount;
    
    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      id,
      { 
        coupon: coupon._id,
        couponDiscount: discountAmount,
        TotalPrice: newTotalPrice
      },
      { new: true }
    )
    .populate('candidates')
    .populate('user')
    .populate('payment')
    .exec();
    
    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found after update`);
    }
    
    return {
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        description: coupon.description
      },
      discountAmount,
      order: updatedOrder
    };
  } catch (error) {
    throw new BadRequestException(error.message);
  }
}
@Post(':id/apply-coupon-by-code')
@UseGuards(JwtAuthGuard)
async applyOrderCouponByCode(
  @Param('id') id: string,
  @Body() body: { code: string },
  @User() user
) {
  const order = await this.ordersService.findOne(id);
  
  // ตรวจสอบสิทธิ์
  if (!user.roles.includes(Role.Admin) && order.user._id.toString() !== user.userId) {
    throw new ForbiddenException('You do not have permission to use coupon with this order');
  }
  
  // ตรวจสอบว่าคำสั่งซื้ออยู่ในสถานะที่ยังไม่ชำระเงิน
  if (order.OrderStatus !== 'awaiting_payment') {
    throw new BadRequestException('คูปองสามารถใช้ได้เฉพาะกับคำสั่งซื้อที่ยังไม่ชำระเงินเท่านั้น');
  }
  
  // คำนวณราคาหลังหักส่วนลดโปรโมชั่น
  const afterPromotionPrice = order.SubTotalPrice - (order.promotionDiscount || 0);
  
  try {
    // ตรวจสอบความถูกต้องของคูปองด้วยโค้ดโดยตรง
    const coupon = await this.couponsService.validateCoupon(
      body.code, 
      afterPromotionPrice,
      user.userId
    );
    
    // คำนวณส่วนลด
    const discountAmount = this.couponsService.calculateDiscount(coupon, afterPromotionPrice);
    
    // มาร์คคูปองว่าถูกใช้แล้ว
    await this.couponsService.markAsUsed(coupon._id.toString(), id);
    
    // อัปเดตคำสั่งซื้อ
    const newTotalPrice = order.TotalPrice - discountAmount;
    
    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      id,
      { 
        coupon: coupon._id,
        couponDiscount: discountAmount,
        TotalPrice: newTotalPrice
      },
      { new: true }
    )
    .populate('candidates')
    .populate('user')
    .populate('payment')
    .exec();
    
    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found after update`);
    }
    
    return {
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        description: coupon.description
      },
      discountAmount,
      order: updatedOrder
    };
  } catch (error) {
    throw new BadRequestException(error.message);
  }
}
  // เพิ่มเมธอดสำหรับยกเลิกการใช้คูปอง
  @Delete(':id/coupon')
  @UseGuards(JwtAuthGuard)
  async removeOrderCoupon(
    @Param('id') id: string,
    @User() user
  ) {
    const order = await this.ordersService.findOne(id);
    
    // ตรวจสอบสิทธิ์
    if (!user.roles.includes(Role.Admin) && order.user._id.toString() !== user.userId) {
      throw new ForbiddenException('You do not have permission to remove coupon from this order');
    }
    
    // ตรวจสอบว่าคำสั่งซื้ออยู่ในสถานะที่ยังไม่ชำระเงิน
    if (order.OrderStatus !== 'awaiting_payment') {
      throw new BadRequestException('สามารถยกเลิกคูปองได้เฉพาะกับคำสั่งซื้อที่ยังไม่ชำระเงินเท่านั้น');
    }
    
    // ตรวจสอบว่ามีคูปองหรือไม่
    if (!order.coupon) {
      throw new BadRequestException('คำสั่งซื้อนี้ไม่ได้ใช้คูปอง');
    }
    
    // อัปเดตคำสั่งซื้อ
    const newTotalPrice = order.TotalPrice + order.couponDiscount;
    
    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      id,
      { 
        coupon: null,
        couponDiscount: 0,
        TotalPrice: newTotalPrice
      },
      { new: true }
    )
    .populate('candidates')
    .populate('user')
    .populate('payment')
    .exec();
    
    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found after update`);
    }
    
    return updatedOrder;
  }
  // เพิ่ม endpoint ต่อไปนี้ใน OrdersController

  @Get(':id/review-status')
  @UseGuards(JwtAuthGuard)
  async checkOrderReviewStatus(@Param('id') id: string, @User() user): Promise<any> {
    try {
      const status = await this.ordersService.checkOrderReviewStatus(id, user.userId);
      
      return {
        success: true,
        data: status,
        message: 'Order review status fetched successfully'
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      console.error('Error checking order review status:', error);
      throw new BadRequestException('ไม่สามารถตรวจสอบสถานะการรีวิวได้');
    }
  } 
}