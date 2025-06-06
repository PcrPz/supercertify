// src/files/files.service.ts - วิธีที่ 3: Backward Compatible
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as Minio from 'minio';
import { InjectMinio } from 'src/decorators/minio.decorator';

export interface UploadResult {
  etag: string;
  filename: string;
  originalName: string;
  size: number;
  url: string; // ✅ static URL
}

@Injectable()
export class FilesService {
  protected _bucketName = 'main';

  constructor(@InjectMinio() private readonly minioService: Minio.Client) {}

  async bucketsList() {
    return await this.minioService.listBuckets();
  }

  // ✅ สร้าง static URL (ไม่หมดอายุ)
  getFileUrl(filename: string): string {
    return `${process.env.BASE_URL || 'http://localhost:3000'}/files/static/${filename}`;
  }

  // ✅ เก็บ getFile() ไว้เพื่อ backward compatibility
  // แต่เปลี่ยนให้ return static URL แทน presigned URL
  async getFile(filename: string): Promise<string> {
    return this.getFileUrl(filename);
  }

  // ✅ เพิ่ม method ใหม่สำหรับ presigned URL (ถ้าต้องการ)
  async getPresignedUrl(filename: string, expiry = 3600): Promise<string> {
    return await this.minioService.presignedUrl(
      'GET',
      this._bucketName,
      filename,
      expiry
    );
  }

  // ✅ ฟังก์ชันสำหรับ serve ไฟล์
  async getFileStream(filename: string) {
    try {
      return await this.minioService.getObject(this._bucketName, filename);
    } catch (error) {
      throw new Error(`File not found: ${filename}`);
    }
  }

  async uploadFile(file: Express.Multer.File, folder?: string, customFilename?: string): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const filename = customFilename || `${randomUUID()}-${file.originalname}`;
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
              size: file.size,
              url: this.getFileUrl(fullPath) // ✅ ใช้ static URL
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
      const bucketExists = await this.minioService.bucketExists(this._bucketName);
      if (!bucketExists) {
        await this.minioService.makeBucket(this._bucketName, 'us-east-1');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error initializing storage:', error);
      return { success: false, error };
    }
  }
}