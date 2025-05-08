// src/payments/payments.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, userId: string): Promise<Payment> {
    // Find the related order
    const existingOrder = await this.orderModel.findById(createPaymentDto.orderId);
    if (!existingOrder) {
      throw new NotFoundException(`Order with ID ${createPaymentDto.orderId} not found`);
    }
    
    // Check if order already has a payment
    if (existingOrder.payment) {
      throw new BadRequestException('This order already has a payment associated with it');
    }
    
    // Generate a unique payment ID
    const paymentId = this.generatePaymentId();
    
    // Create the new payment
    const newPayment = new this.paymentModel({
      Payment_ID: paymentId,
      paymentMethod: createPaymentDto.paymentMethod,
      paymentStatus: 'pending_verification',
      transferInfo: createPaymentDto.transferInfo,
      timestamp: new Date(),
      paymentUpdatedAt: new Date(),
      paymentUpdatedBy: userId,
      order: createPaymentDto.orderId
    });
    
    const payment = await newPayment.save();
    
    // Update the order to reference this payment
    await this.orderModel.findByIdAndUpdate(
      createPaymentDto.orderId,
      { 
        payment: payment._id,
        OrderStatus: 'pending_verification'
      }
    );
    
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

  async update(id: string, updatePaymentDto: UpdatePaymentDto, userId: string): Promise<Payment> {
    // Validate the payment status
    const validStatuses = ['pending_verification', 'completed', 'awaiting_payment', 'failed', 'refunded'];
    if (updatePaymentDto.paymentStatus && !validStatuses.includes(updatePaymentDto.paymentStatus)) {
      throw new BadRequestException(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    // Update the payment
    const payment = await this.paymentModel.findById(id);
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    
    // Update properties
    payment.paymentMethod = updatePaymentDto.paymentMethod || payment.paymentMethod;
    payment.paymentStatus = updatePaymentDto.paymentStatus || payment.paymentStatus;
    if (updatePaymentDto.transferInfo) {
      payment.transferInfo = {
        ...payment.transferInfo,
        ...updatePaymentDto.transferInfo
      };
    }
    payment.paymentUpdatedAt = new Date();
    payment.paymentUpdatedBy = userId;
    
    const updatedPayment = await payment.save();
    
    // If payment status is changed, update the order status accordingly
    if (updatePaymentDto.paymentStatus) {
      let orderStatus = 'awaiting_payment';
      
      if (updatePaymentDto.paymentStatus === 'pending_verification') {
        orderStatus = 'pending_verification';
      } else if (updatePaymentDto.paymentStatus === 'completed') {
        orderStatus = 'payment_verified';
      }
      
      await this.orderModel.findByIdAndUpdate(
        payment.order,
        { OrderStatus: orderStatus }
      );
    }
    
    return updatedPayment;
  }

  async updatePaymentStatus(id: string, status: string, userId: string): Promise<Payment> {
    // Validate payment status
    const validStatuses = ['pending_verification', 'completed', 'awaiting_payment', 'failed', 'refunded'];
    
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    // Find the payment
    const payment = await this.findOne(id);
    
    // Update payment status
    payment.paymentStatus = status;
    payment.paymentUpdatedAt = new Date();
    payment.paymentUpdatedBy = userId;
    
    // Save the updated payment
    const updatedPayment = await this.paymentModel.findByIdAndUpdate(
      id,
      {
        paymentStatus: status,
        paymentUpdatedAt: new Date(),
        paymentUpdatedBy: userId
      },
      { new: true }
    ).exec();
    
    if (!updatedPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found after update`);
    }
    
    // Determine the appropriate order status based on payment status
    let orderStatus: string;
    switch (status) {
      case 'pending_verification':
        orderStatus = 'pending_verification';
        break;
      case 'completed':
        orderStatus = 'payment_verified';
        break;
      case 'failed':
      case 'refunded':
      case 'awaiting_payment':
        orderStatus = 'awaiting_payment';
        break;
      default:
        orderStatus = 'awaiting_payment';
    }
    
    // Update the associated order's status
    await this.orderModel.findByIdAndUpdate(
      payment.order,
      { OrderStatus: orderStatus }
    );
    
    return updatedPayment;
  }

  async remove(id: string): Promise<void> {
    const payment = await this.findOne(id);
    
    // Remove the payment reference from the order
    await this.orderModel.findByIdAndUpdate(
      payment.order,
      { payment: null, OrderStatus: 'awaiting_payment' }
    );
    
    // Delete the payment
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