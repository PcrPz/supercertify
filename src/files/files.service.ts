// src/files/files.service.ts
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as Minio from 'minio';
import { InjectMinio } from 'src/decorators/minio.decorator';

export interface UploadResult {
  etag: string;
  filename: string;
  originalName: string;
  size: number;
}

@Injectable()
export class FilesService {
  protected _bucketName = 'main';

  constructor(@InjectMinio() private readonly minioService: Minio.Client) {}

  async bucketsList() {
    return await this.minioService.listBuckets();
  }

  async getFile(filename: string) {
    return await this.minioService.presignedUrl(
      'GET',
      this._bucketName,
      filename,
      86400 // URL หมดอายุใน 24 ชั่วโมง
    );
  }

  async uploadFile(file: Express.Multer.File, folder?: string, customFilename?: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
      const filename = customFilename || `${randomUUID()}-${file.originalname}`;
      
      // ถ้ามีการระบุโฟลเดอร์ ให้เพิ่มเข้าไปในชื่อไฟล์
      const fullPath = folder ? `${folder}/${filename}` : filename;
      
      this.minioService.putObject(
        this._bucketName,
        fullPath,
        file.buffer,
        file.size,
        (error, objInfo) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              etag: objInfo.etag,
              filename: fullPath,
              originalName: file.originalname,
              size: file.size
            });
          }
        },
      );
    });
  }

async uploadMultipleFiles(files: Express.Multer.File[], folder?: string, customFilenames?: string[]): Promise<UploadResult[]> {
  const uploadPromises = files.map((file, index) => {
    const customFilename = customFilenames && customFilenames[index] ? customFilenames[index] : undefined;
    return this.uploadFile(file, folder, customFilename);
  });
  
  return Promise.all(uploadPromises);
}
  
  async deleteFile(filename: string): Promise<boolean> {
    try {
      await this.minioService.removeObject(this._bucketName, filename);
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }
  
  async initializeStorage() {
    try {
      // ตรวจสอบว่ามี bucket หรือไม่
      const bucketExists = await this.minioService.bucketExists(this._bucketName);
      if (!bucketExists) {
        // สร้าง bucket ใหม่
        await this.minioService.makeBucket(this._bucketName, 'us-east-1');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing storage:', error);
      return { success: false, error };
    }
  }
}