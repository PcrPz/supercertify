import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MINIO_TOKEN } from 'src/decorators/minio.decorator';

@Global()
@Module({
  exports: [MINIO_TOKEN],
  providers: [
    {
      inject: [ConfigService],
      provide: MINIO_TOKEN,
      useFactory: async (
        configService: ConfigService,
      ): Promise<Minio.Client> => {
        const client = new Minio.Client({
          endPoint: configService.getOrThrow("MINIO_ENDPOINT"),
          port: +configService.getOrThrow("MINIO_PORT"),
          accessKey: configService.getOrThrow("MINIO_ACCESS_KEY"),
          secretKey: configService.getOrThrow("MINIO_SECRET_KEY"),
          useSSL: true,  // เปลี่ยนเป็น true
          region: configService.get("MINIO_REGION", "auto"),  // เพิ่มบรรทัดนี้
        });
        return client;
      },
    },
  ],
})
export class MinioModule {}