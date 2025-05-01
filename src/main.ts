import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ลบ properties ที่ไม่ได้ระบุใน DTO ออก
      forbidNonWhitelisted: true, // ไม่ยอมรับ properties ที่ไม่ได้ระบุใน DTO
      transform: true, // แปลงค่าเป็น type ที่ถูกต้องตาม DTO
    }),
  );
  
  app.enableCors({
    origin:["http://localhost:3001/","https://supercertify-front.vercel.app/"],
    credentials: true,
  }); // เปิดใช้งาน CORS
  
  await app.listen(3000);
}
bootstrap();