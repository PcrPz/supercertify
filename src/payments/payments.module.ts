// src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { FilesModule } from '../files/files.module'; // เพิ่ม import

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Order.name, schema: OrderSchema }
    ]),
    FilesModule // เพิ่ม FilesModule
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService, MongooseModule]
})
export class PaymentsModule {}