import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { CandidatesService } from '../candidates/candidates.service';
import { UpdatePaymentDto } from 'src/orders/dto/update-payment.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private candidatesService: CandidatesService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId?: string): Promise<Order> {
    // 1. สร้าง candidates
    const createdCandidates = await Promise.all(
      createOrderDto.candidates.map(candidateDto => 
        this.candidatesService.create(candidateDto)
      )
    );
  
    // 2. สร้าง order
    const newOrder = new this.orderModel({
      OrderType: createOrderDto.OrderType,
      OrderStatus: 'awaiting_payment', // กำหนดสถานะเริ่มต้นเป็น 'awaiting_payment'
      TrackingNumber: this.generateTrackingNumber(),
      user: userId, // ถ้ามีการเชื่อมโยงกับ user
      candidates: createdCandidates.map(candidate => candidate._id),
      TotalPrice: createOrderDto.totalPrice,
      SubTotalPrice: createOrderDto.subtotalPrice,
      // เพิ่ม services เข้าไปใน order
      services: createOrderDto.services.map(service => ({
        service: service.service,
        title: service.title,
        quantity: service.quantity,
        price: service.price
      }))
    });
  
    return newOrder.save();
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find()
      .populate('candidates')
      .populate('user')
      .exec();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderModel.findById(id)
      .populate('candidates')
      .populate('user')
      .exec();
    
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    return order;
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return this.orderModel.find({ user: userId })
      .populate('candidates')
      .exec();
  }

  // เพิ่มฟังก์ชันอัปเดตข้อมูลการชำระเงิน
  async updatePayment(id: string, updatePaymentDto: UpdatePaymentDto, userId: string): Promise<Order> {
    const order = await this.findOne(id);
    
    // สร้างข้อมูลการชำระเงิน
    const paymentInfo = {
      paymentMethod: updatePaymentDto.paymentMethod,
      paymentStatus: updatePaymentDto.paymentStatus,
      transferInfo: updatePaymentDto.transferInfo,
      timestamp: updatePaymentDto.timestamp || new Date(),
      paymentUpdatedAt: new Date(),
      paymentUpdatedBy: userId
    };
    
    // อัปเดต Order Status ตามสถานะการชำระเงิน
    let orderStatus = 'awaiting_payment';
    
    if (updatePaymentDto.paymentStatus === 'pending_verification') {
      orderStatus = 'pending_verification';
    } else if (updatePaymentDto.paymentStatus === 'completed') {
      orderStatus = 'payment_verified';
    }
    
    // อัปเดต Order
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          paymentInfo: paymentInfo,
          OrderStatus: orderStatus
        },
        { new: true }
      )
      .populate('candidates')
      .populate('user')
      .exec();
    
    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    return updatedOrder;
  }

  // เพิ่มฟังก์ชันอัปเดตสถานะการชำระเงิน (สำหรับแอดมิน)
  async updatePaymentStatus(id: string, status: string, userId: string): Promise<Order> {
    const validStatuses = ['pending_verification', 'completed', 'awaiting_payment', 'failed', 'refunded'];
    
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    const order = await this.findOne(id);
    
    // อัปเดตข้อมูลการชำระเงิน
    const paymentInfo = order.paymentInfo || {};
    paymentInfo.paymentStatus = status;
    paymentInfo.paymentUpdatedAt = new Date();
    paymentInfo.paymentUpdatedBy = userId;
    
    // กำหนดสถานะ Order ตามสถานะการชำระเงิน
    let orderStatus = order.OrderStatus;
    
    if (status === 'completed') {
      orderStatus = 'payment_verified';
    } else if (status === 'failed') {
      orderStatus = 'awaiting_payment';
    }
    
    // อัปเดต Order
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        id,
        {
          paymentInfo: paymentInfo,
          OrderStatus: orderStatus
        },
        { new: true }
      )
      .populate('candidates')
      .populate('user')
      .exec();
    
    // เพิ่มการตรวจสอบ null
    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found after update`);
    }
    
    return updatedOrder;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    // Define valid order statuses
    const validStatuses = ['awaiting_payment', 'pending_verification', 'payment_verified', 'processing', 'completed', 'cancelled'];
    
    // Validate status
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid order status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    // Update order status
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        id, 
        { OrderStatus: status }, 
        { new: true }
      )
      .populate('candidates')
      .populate('user')
      .exec();
    
    // Check if order exists
    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    return updatedOrder;
  }

  private generateTrackingNumber(): string {
    const prefix = 'TRK';
    const timestamp = Date.now().toString().substring(5);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
}