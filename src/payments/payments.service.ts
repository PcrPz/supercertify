import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema'; 
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from '../orders/dto/update-payment.dto';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private ordersService: OrdersService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    // ตรวจสอบว่ามี order อยู่จริง
    await this.ordersService.findOne(createPaymentDto.orderId);
    
    // สร้าง Payment ID
    const paymentId = this.generatePaymentId();
    
    // สร้าง Payment
    const newPayment = new this.paymentModel({
      P_ID: paymentId,
      P_Uname: createPaymentDto.P_Uname,
      P_Type: createPaymentDto.P_Type,
      P_Status: 'pending',
      P_Email: createPaymentDto.P_Email,
      P_Tel: createPaymentDto.P_Tel,
      Amount: createPaymentDto.Amount,
      order: createPaymentDto.orderId,
    });
    
    const payment = await newPayment.save();
    
    return payment;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentModel.find().populate('order').exec();
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentModel.findById(id).populate('order').exec();
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async findByOrderId(orderId: string): Promise<Payment[]> {
    return this.paymentModel.find({ order: orderId }).exec();
  }
  
  async updateStatus(id: string, status: string): Promise<Order> {
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        id,
        { OrderStatus: status },
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

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    const updatedPayment = await this.paymentModel
      .findByIdAndUpdate(id, updatePaymentDto, { new: true })
      .populate('order')
      .exec();
    
    if (!updatedPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    
    // ถ้าอัปเดตสถานะเป็น completed ให้อัปเดตสถานะของ Order เป็น payment_verified
    if (updatePaymentDto.paymentStatus === 'completed') {
      const orderId = updatedPayment.order.toString();
      
      // Update order status
      await this.ordersService.updateOrderStatus(orderId, 'payment_verified');
    }
    
    return updatedPayment;
  }
  

  async remove(id: string): Promise<void> {
    const result = await this.paymentModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
  }

  private generatePaymentId(): string {
    const prefix = 'PAY';
    const timestamp = Date.now().toString().substring(5);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }
}