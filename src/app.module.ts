import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { ServicesModule } from './services/services.module';
import { PackagesModule } from './packages/packages.module';
import config from './config/config';


@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
    load: [config],
  }),UsersModule,DatabaseModule, AuthModule, ServicesModule, PackagesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
