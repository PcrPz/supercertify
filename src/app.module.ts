import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { ServicesModule } from './services/services.module';
import { PackagesModule } from './packages/packages.module';
import { CandidatesModule } from './candidates/candidates.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { MinioModule } from './minio/minio.module';
import { FilesModule } from './files/files.module';
import { DocumentsModule } from './documents/documents.module';
import { CouponsModule } from './coupons/coupons.module';
import { SettingsModule } from './settings/settings.module';
import { ReviewsModule } from './reviews/reviews.module';
import config from './config/config';


@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    load: [config],
  }),
  UsersModule,
  DatabaseModule,
  AuthModule,
  ServicesModule,
  PackagesModule,
  CandidatesModule,
  OrdersModule,
  PaymentsModule,
  MinioModule,
  FilesModule,
  DocumentsModule,
  CouponsModule,
  SettingsModule,
  ReviewsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
