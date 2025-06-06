// src/orders/orders.service.ts - แก้ไข TypeScript errors

import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model} from 'mongoose';
import { Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { CandidatesService } from '../candidates/candidates.service';
import { CouponsService } from '../coupons/coupons.service';
import { Coupon } from '../coupons/schemas/coupon.schema'; // ✅ เพิ่ม import

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @Inject(forwardRef(() => CandidatesService)) private candidatesService: CandidatesService,
    private readonly couponsService: CouponsService,
  ) {}

async create(createOrderDto: CreateOrderDto, userId?: string): Promise<Order> {
  // ✅ แก้ไข type declaration
  let couponId: any | null = null;
  let couponDiscount = 0;
  let validatedCoupon: Coupon | null = null; // ✅ ระบุ type ชัดเจน
  
  if (createOrderDto.couponCode) {
    try {
      console.log('🔍 Processing coupon in order creation:', createOrderDto.couponCode);
      
      // คำนวณราคาหลังหักส่วนลดโปรโมชั่น
      const subtotal = createOrderDto.subtotalPrice;
      const promotionDiscount = createOrderDto.promotionDiscount || 0;
      const afterPromotionPrice = subtotal - promotionDiscount;
      
      console.log('💰 Order pricing:', {
        subtotal,
        promotionDiscount,
        afterPromotionPrice,
        couponCode: createOrderDto.couponCode
      });
      
      // ✅ validateCoupon จะ return Coupon object หรือ throw error
      validatedCoupon = await this.couponsService.validateCoupon(
        createOrderDto.couponCode, 
        afterPromotionPrice,
        userId
      );
      
      // ✅ เพิ่ม null check
      if (validatedCoupon) {
        console.log('✅ Coupon validated successfully:', {
          id: validatedCoupon._id,
          code: validatedCoupon.code,
          discountPercent: validatedCoupon.discountPercent
        });
        
        // คำนวณส่วนลดจากคูปอง
        couponDiscount = this.couponsService.calculateDiscount(validatedCoupon, afterPromotionPrice);
        
        console.log('💵 Calculated coupon discount:', couponDiscount);
        
        // เก็บ coupon ID สำหรับบันทึกใน Order
        couponId = validatedCoupon._id;
      }
      
    } catch (error) {
      console.error('❌ Error validating coupon during order creation:', error);
      // ถ้าเกิดข้อผิดพลาดในการตรวจสอบคูปอง ให้ throw error แทนที่จะข้าม
      throw new BadRequestException(`ไม่สามารถใช้คูปอง: ${error.message}`);
    }
  }

  // 1. Create candidates
  const createdCandidates = await Promise.all(
    createOrderDto.candidates.map(candidateDto => 
      this.candidatesService.create(candidateDto)
    )
  );

  // 2. Create order
  const newOrder = new this.orderModel({
    OrderType: createOrderDto.OrderType,
    OrderStatus: 'awaiting_payment',
    TrackingNumber: this.generateTrackingNumber(),
    user: userId,
    candidates: createdCandidates.map(candidate => candidate._id),
    SubTotalPrice: createOrderDto.subtotalPrice,
    promotionDiscount: createOrderDto.promotionDiscount || 0,
    couponDiscount: couponDiscount,
    TotalPrice: createOrderDto.totalPrice,
    services: createOrderDto.services.map(service => ({
      service: service.service,
      title: service.title,
      quantity: service.quantity,
      price: service.price
    })),
    payment: null,
    coupon: couponId
  });

  // บันทึก Order ก่อน
  const savedOrder = await newOrder.save();
  
  // ✅ ถ้ามีคูปอง ให้ mark ว่าใช้แล้วหลังจากสร้าง Order สำเร็จ
  if (validatedCoupon && savedOrder) {
    try {
      console.log('📝 Marking coupon as used:', validatedCoupon._id);
      await this.couponsService.markAsUsed(
        validatedCoupon._id.toString(), 
        savedOrder._id.toString()
      );
      console.log('✅ Coupon marked as used successfully');
    } catch (markError) {
      console.error('❌ Error marking coupon as used:', markError);
      // ถึงแม้จะ mark coupon ไม่สำเร็จ แต่ Order ยังคงถูกสร้างแล้ว
    }
  }

  return savedOrder;
}

  // ฟังก์ชันอื่นๆ คงเดิม...
  async findAll(): Promise<Order[]> {
    return this.orderModel.find()
      .populate('candidates')
      .populate('user')
      .populate('payment')
      .exec();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id)
      .populate('candidates')
      .populate('user')
      .populate('payment')
      .exec();
    
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    return order;
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return this.orderModel.find({ user: userId })
      .populate('candidates')
      .populate('payment')
      .exec();
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const validStatuses = ['awaiting_payment', 'pending_verification', 'payment_verified', 'processing', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid order status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        id, 
        { OrderStatus: status }, 
        { new: true }
      )
      .populate('candidates')
      .populate('user')
      .populate('payment')
      .exec();
    
    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    return updatedOrder;
  }

async deleteOrder(id: string): Promise<any> {
  console.log('🗑️ Starting order deletion process:', id);
  
  // ตรวจสอบว่า order นี้มีอยู่จริงหรือไม่
  const order = await this.orderModel.findById(id).exec();
  if (!order) {
    throw new NotFoundException(`Order with ID ${id} not found`);
  }
  
  console.log('📋 Order found:', {
    id: order._id,
    status: order.OrderStatus,
    hasCoupon: !!order.coupon,
    couponId: order.coupon
  });
  
  // ✅ Step 1: Release coupon ก่อน (ถ้ามี)
  if (order.coupon) {
    console.log('🎫 Order has coupon, releasing it...');
    try {
      await this.couponsService.releaseCoupon(id);
    } catch (couponError) {
      console.error('❌ Error releasing coupon, but continuing with order deletion:', couponError);
      // ไม่ stop การลบ Order แม้ว่า coupon release จะล้มเหลว
    }
  } else {
    console.log('ℹ️ Order has no coupon to release');
  }
  
  // ✅ Step 2: Delete candidates
  if (order.candidates && order.candidates.length > 0) {
    console.log(`👥 Deleting ${order.candidates.length} candidates...`);
    try {
      await Promise.all(
        order.candidates.map(candidateId => 
          this.candidatesService.remove(candidateId.toString())
        )
      );
      console.log('✅ All candidates deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting candidates:', error);
      // ไม่ stop การลบ Order
    }
  }
  
  // ✅ Step 3: Delete order
  console.log('🗑️ Deleting order...');
  const result = await this.orderModel.findByIdAndDelete(id).exec();
  
  if (!result) {
    throw new NotFoundException(`Order with ID ${id} not found during deletion`);
  }
  
  console.log('✅ Order deleted successfully:', id);
  
  return {
    success: true,
    message: 'Order deleted successfully',
    deletedOrder: result,
    couponReleased: !!order.coupon
  };
}

  async findByTrackingNumber(trackingNumber: string): Promise<Order> {
    const order = await this.orderModel.findOne({ TrackingNumber: trackingNumber })
      .populate('candidates')
      .populate('user')
      .populate('payment')
      .exec();
    
    if (!order) {
      throw new NotFoundException(`Order with tracking number ${trackingNumber} not found`);
    }
    
    return order;
  }

  private generateTrackingNumber(): string {
    const prefix = 'SCT';
    const timestamp = Date.now().toString().substring(5);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  async markOrderAsReviewed(orderId: string, reviewId: string): Promise<Order> {
    console.log(`Marking order ${orderId} as reviewed with review ${reviewId}`);
    
    // ตรวจสอบว่า Order มีอยู่จริงหรือไม่
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }
    
    console.log('Current order review status:', { 
      isReviewed: order.isReviewed, 
      reviewedAt: order.reviewedAt, 
      review: order.review 
    });
    
    // อัปเดตสถานะการ Review
    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      orderId,
      {
        $set: {
          isReviewed: true,
          reviewedAt: new Date(),
          review: reviewId
        }
      },
      { new: true }
    )
    .populate('candidates')
    .populate('user')
    .populate('payment')
    .populate('review')
    .exec();

    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${orderId} not found after update`);
    }
    
    console.log('Order marked as reviewed successfully');
    
    return updatedOrder;
  }

async findReviewableOrdersByUserId(userId: string): Promise<Order[]> {
  console.log('Looking for reviewable orders for user:', userId);

  // ดึง order ที่มีสถานะ completed และยังไม่ได้รับการ review
  const orders = await this.orderModel.find({
    user: userId,
    OrderStatus: 'completed',
    isReviewed: { $ne: true } // ใช้ $ne เพื่อให้รวมกรณีที่ isReviewed เป็น false หรือ null
  })
  .populate('candidates')
  .populate('payment')
  .exec();

  console.log(`Found ${orders.length} reviewable orders`);
  
  // สำหรับ debug
  if (orders.length > 0) {
    console.log('Sample order:', {
      id: orders[0]._id,
      status: orders[0].OrderStatus,
      isReviewed: orders[0].isReviewed
    });
  }

  return orders;
}

async checkOrderReviewStatus(orderId: string, userId: string): Promise<any> {
  const order = await this.findOne(orderId);
  
  // ตรวจสอบว่าเป็นเจ้าของ Order หรือไม่
  if (order.user._id.toString() !== userId) {
    throw new ForbiddenException('You do not have permission to check this order');
  }
  
  // ตรวจสอบสถานะของ Order
  const isCompleted = order.OrderStatus === 'completed';
  
  return {
    orderId: order._id,
    canReview: isCompleted && !order.isReviewed,
    isCompleted,
    isReviewed: order.isReviewed,
    reviewedAt: order.reviewedAt,
    orderStatus: order.OrderStatus
  };
}
}