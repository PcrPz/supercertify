import { Injectable, NotFoundException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { CandidatesService } from '../candidates/candidates.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @Inject(forwardRef(() => CandidatesService)) private candidatesService: CandidatesService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId?: string): Promise<Order> {
    // 1. Create candidates
    const createdCandidates = await Promise.all(
      createOrderDto.candidates.map(candidateDto => 
        this.candidatesService.create(candidateDto)
      )
    );
  
    // 2. Create order
    const newOrder = new this.orderModel({
      OrderType: createOrderDto.OrderType,
      OrderStatus: 'awaiting_payment', // Initial status
      TrackingNumber: this.generateTrackingNumber(),
      user: userId,
      candidates: createdCandidates.map(candidate => candidate._id),
      TotalPrice: createOrderDto.totalPrice,
      SubTotalPrice: createOrderDto.subtotalPrice,
      // Add services to order
      services: createOrderDto.services.map(service => ({
        service: service.service,
        title: service.title,
        quantity: service.quantity,
        price: service.price
      })),
      payment: null // Initialize with no payment
    });
  
    return newOrder.save();
  }

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
      .populate('payment')
      .exec();
    
    // Check if order exists
    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    return updatedOrder;
  }

  async deleteOrder(id: string): Promise<any> {
    // ตรวจสอบว่า order นี้มีอยู่จริงหรือไม่
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    // ลบข้อมูล candidates ที่เกี่ยวข้อง
    if (order.candidates && order.candidates.length > 0) {
      try {
        await Promise.all(
          order.candidates.map(candidateId => 
            this.candidatesService.remove(candidateId.toString())
          )
        );
      } catch (error) {
        console.error('Error deleting candidates:', error);
        // ไม่ throw error ในกรณีนี้ เพื่อให้สามารถลบ order ได้แม้ว่าจะลบ candidates ไม่สำเร็จ
      }
    }
    
    // ลบข้อมูล order
    const result = await this.orderModel.findByIdAndDelete(id).exec();
    
    return {
      success: true,
      message: 'Order deleted successfully',
      deletedOrder: result
    };
  }

  private generateTrackingNumber(): string {
    const prefix = 'SCT';
    const timestamp = Date.now().toString().substring(5);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
}