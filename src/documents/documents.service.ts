// src/documents/documents.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { DocumentFile, DocumentDocument } from './schemas/document.schema';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { FilesService } from '../files/files.service';
import { CandidatesService } from '../candidates/candidates.service';
import { ServicesService } from '../services/services.service';
import { randomUUID } from 'crypto';

// กำหนดประเภทข้อมูลใหม่
interface MissingDocument {
  serviceId: any;
  serviceTitle: string;
  documentId: string;
  documentName: string;
  fileTypes: string[];
  maxSize?: number;
}

@Injectable()
export class DocumentsService {
    constructor(
        @InjectModel(DocumentFile.name) private documentModel: Model<DocumentDocument>,
        private filesService: FilesService,
        private candidatesService: CandidatesService,
        private servicesService: ServicesService  // <-- ต้องการตัวนี้
      ) {}

  async uploadDocument(file: Express.Multer.File, uploadDocumentDto: UploadDocumentDto): Promise<DocumentFile> {
    // 1. ตรวจสอบว่า Candidate มีอยู่จริง
    const candidate = await this.candidatesService.findOne(uploadDocumentDto.candidateId);
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${uploadDocumentDto.candidateId} not found`);
    }

    // 2. ตรวจสอบว่า Service มีอยู่จริง
    const service = await this.servicesService.findOne(uploadDocumentDto.serviceId);
    if (!service) {
      throw new NotFoundException(`Service with ID ${uploadDocumentDto.serviceId} not found`);
    }

    // 3. ตรวจสอบว่าเอกสารประเภทนี้ถูกกำหนดให้ต้องใช้สำหรับ Service นี้หรือไม่
    const requiredDocument = service.RequiredDocuments?.find(
      doc => doc.document_id === uploadDocumentDto.documentType
    );
    
    if (!requiredDocument) {
      throw new BadRequestException(
        `Document type "${uploadDocumentDto.documentType}" is not required for service "${service.Service_Title}"`
      );
    }

    // 4. ตรวจสอบประเภทไฟล์
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!requiredDocument.file_types.includes(fileExtension)) {
      throw new BadRequestException(
        `File type "${fileExtension}" is not allowed. Allowed types: ${requiredDocument.file_types.join(', ')}`
      );
    }

    // 5. ตรวจสอบขนาดไฟล์
    if (requiredDocument.max_size && file.size > requiredDocument.max_size) {
      throw new BadRequestException(
        `File size (${file.size} bytes) exceeds the maximum allowed size (${requiredDocument.max_size} bytes)`
      );
    }

    // 6. อัปโหลดไฟล์ไปยัง MinIO
    const folder = `documents/${uploadDocumentDto.candidateId}/${uploadDocumentDto.serviceId}/${uploadDocumentDto.documentType}`;
    const fileNameWithUUID = `${randomUUID()}-${file.originalname}`;
    
    const uploadResult = await this.filesService.uploadFile(file, folder, fileNameWithUUID);
    const fileUrl = await this.filesService.getFile(`${folder}/${fileNameWithUUID}`);

    // 7. ตรวจสอบว่ามีเอกสารประเภทนี้อยู่แล้วหรือไม่
    const existingDocument = await this.documentModel.findOne({
      candidate: uploadDocumentDto.candidateId,
      service: uploadDocumentDto.serviceId,
      Document_Type: uploadDocumentDto.documentType
    }).exec();

    // ถ้ามีอยู่แล้ว ให้อัปเดต
    if (existingDocument) {
      existingDocument.File_Path = fileUrl;
      existingDocument.File_Name = file.originalname;
      existingDocument.File_Type = file.mimetype;
      existingDocument.File_Size = file.size;
      existingDocument.isVerified = false;
      existingDocument.verifiedAt = null;
      existingDocument.verifiedBy = null;
      
      return existingDocument.save();
    }

    // 8. บันทึกข้อมูลเอกสารลงในฐานข้อมูล
    const documentFile = new this.documentModel({
      File_ID: randomUUID(),
      File_Path: fileUrl,
      File_Name: file.originalname,
      File_Type: file.mimetype,
      File_Size: file.size,
      Document_Type: uploadDocumentDto.documentType,
      candidate: uploadDocumentDto.candidateId,
      service: uploadDocumentDto.serviceId,
      isVerified: uploadDocumentDto.isVerified || false
    });

    return documentFile.save();
  }
// เพิ่ม method นี้ในคลาส DocumentsService
async uploadMultipleDocuments(files: Express.Multer.File[], uploadDocumentDto: UploadDocumentDto): Promise<DocumentFile[]> {
  // 1. ตรวจสอบว่า Candidate มีอยู่จริง
  const candidate = await this.candidatesService.findOne(uploadDocumentDto.candidateId);
  if (!candidate) {
    throw new NotFoundException(`Candidate with ID ${uploadDocumentDto.candidateId} not found`);
  }

  // 2. ตรวจสอบว่า Service มีอยู่จริง
  const service = await this.servicesService.findOne(uploadDocumentDto.serviceId);
  if (!service) {
    throw new NotFoundException(`Service with ID ${uploadDocumentDto.serviceId} not found`);
  }

  // 3. ตรวจสอบว่าเอกสารประเภทนี้ถูกกำหนดให้ต้องใช้สำหรับ Service นี้หรือไม่
  const requiredDocument = service.RequiredDocuments?.find(
    doc => doc.document_id === uploadDocumentDto.documentType
  );
  
  if (!requiredDocument) {
    throw new BadRequestException(
      `Document type "${uploadDocumentDto.documentType}" is not required for service "${service.Service_Title}"`
    );
  }

  // 4. สร้าง array เพื่อเก็บผลลัพธ์
  const uploadedDocuments: DocumentFile[] = [];

  // 5. สร้างโฟลเดอร์สำหรับเก็บไฟล์
  const folder = `documents/${uploadDocumentDto.candidateId}/${uploadDocumentDto.serviceId}/${uploadDocumentDto.documentType}`;

  // 6. วนลูปแต่ละไฟล์
  for (const file of files) {
    // 6.1 ตรวจสอบประเภทไฟล์
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!requiredDocument.file_types.includes(fileExtension)) {
      throw new BadRequestException(
        `File type "${fileExtension}" is not allowed. Allowed types: ${requiredDocument.file_types.join(', ')}`
      );
    }

    // 6.2 ตรวจสอบขนาดไฟล์
    if (requiredDocument.max_size && file.size > requiredDocument.max_size) {
      throw new BadRequestException(
        `File size (${file.size} bytes) exceeds the maximum allowed size (${requiredDocument.max_size} bytes)`
      );
    }

    // 6.3 อัปโหลดไฟล์ไปยัง MinIO
    const fileNameWithUUID = `${randomUUID()}-${file.originalname}`;
    const uploadResult = await this.filesService.uploadFile(file, folder, fileNameWithUUID);
    const fileUrl = await this.filesService.getFile(`${folder}/${fileNameWithUUID}`);

    // 6.4 ตรวจสอบว่ามีเอกสารประเภทนี้อยู่แล้วหรือไม่
    const existingDocument = await this.documentModel.findOne({
      candidate: uploadDocumentDto.candidateId,
      service: uploadDocumentDto.serviceId,
      Document_Type: uploadDocumentDto.documentType
    }).exec();

    let document: DocumentFile;
    
    // 6.5 ถ้ามีอยู่แล้ว ให้อัปเดต
    if (existingDocument) {
      existingDocument.File_Path = fileUrl;
      existingDocument.File_Name = file.originalname;
      existingDocument.File_Type = file.mimetype;
      existingDocument.File_Size = file.size;
      existingDocument.isVerified = false;
      existingDocument.verifiedAt = null;
      existingDocument.verifiedBy = null;
      
      document = await existingDocument.save();
    } else {
      // 6.6 สร้างใหม่
      const documentFile = new this.documentModel({
        File_ID: randomUUID(),
        File_Path: fileUrl,
        File_Name: file.originalname,
        File_Type: file.mimetype,
        File_Size: file.size,
        Document_Type: uploadDocumentDto.documentType,
        candidate: uploadDocumentDto.candidateId,
        service: uploadDocumentDto.serviceId,
        isVerified: uploadDocumentDto.isVerified || false
      });
      
      document = await documentFile.save();
    }
    
    uploadedDocuments.push(document);
  }

  return uploadedDocuments;
}

  async getDocumentsByCandidateAndService(candidateId: string, serviceId: string): Promise<DocumentFile[]> {
    return this.documentModel.find({
      candidate: candidateId,
      service: serviceId
    }).exec();
  }

  async getAllCandidateDocuments(candidateId: string): Promise<DocumentFile[]> {
    return this.documentModel.find({
      candidate: candidateId
    }).populate('service').exec();
  }

  async verifyDocument(documentId: string, userId: string): Promise<DocumentFile> {
    const document = await this.documentModel.findById(documentId).exec();
    
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }
    
    document.isVerified = true;
    document.verifiedAt = new Date();
    document.verifiedBy = new MongooseSchema.Types.ObjectId(userId);
    
    return document.save();
  }

  async deleteDocument(documentId: string): Promise<void> {
    const document = await this.documentModel.findById(documentId).exec();
    
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }
    
    // TODO: ถ้าต้องการลบไฟล์จาก MinIO ด้วย ให้เรียกใช้ filesService.deleteFile(...)
    
    await this.documentModel.findByIdAndDelete(documentId).exec();
  }

  async getDocumentsByCandidate(candidateId: string): Promise<any> {
    const candidate = await this.candidatesService.findOne(candidateId);
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }
    
    // หาเอกสารทั้งหมดของ candidate นี้
    const documents = await this.documentModel.find({
      candidate: candidateId
    }).exec();
    
    // เราไม่ต้อง populate service เพราะมันทำให้เกิดปัญหา
    // แทนที่จะใช้ .populate('service') เราจะดึง ID ออกมาอย่างเดียว
    
    // จัดกลุ่มตาม service
    const serviceDocuments = {};
    
    for (const doc of documents) {
      // ดึง service ID เป็น string
      const serviceId = doc.service.toString(); // เรียกใช้ toString() เพื่อแน่ใจว่าได้ string
      
      if (!serviceDocuments[serviceId]) {
        try {
          // ส่ง string ID ไปให้ findOne
          const service = await this.servicesService.findOne(serviceId);
          serviceDocuments[serviceId] = {
            service: {
              _id: serviceId,
              title: service.Service_Title,
              requiredDocuments: service.RequiredDocuments
            },
            documents: []
          };
        } catch (error) {
          console.error(`Error fetching service with ID ${serviceId}:`, error);
          // กรณีไม่พบ service ให้สร้างข้อมูลพื้นฐาน
          serviceDocuments[serviceId] = {
            service: {
              _id: serviceId,
              title: 'ไม่พบชื่อบริการ',
              requiredDocuments: []
            },
            documents: []
          };
        }
      }
      
      serviceDocuments[serviceId].documents.push({
        _id: doc._id,
        documentType: doc.Document_Type,
        fileName: doc.File_Name,
        filePath: doc.File_Path,
        isVerified: doc.isVerified,
        uploadedAt: (doc as any).createdAt || new Date()
      });
    }
    
    return {
      candidate: {
        _id: candidate._id,
        name: candidate.C_FullName,
        email: candidate.C_Email,
        company: candidate.C_Company_Name
      },
      serviceDocuments: Object.values(serviceDocuments)
    };
  }

  async getMissingDocuments(candidateId: string): Promise<any> {
    const candidate = await this.candidatesService.findOne(candidateId);
    console.log(candidateId)
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }
    
    // หาบริการทั้งหมดที่ candidate ใช้
    const services = await Promise.all(
      candidate.services.map(serviceId => {
        // แน่ใจว่าส่ง string ไปให้ findOne
        return this.servicesService.findOne(serviceId._id.toString());
      })
    );
    
    // หาเอกสารทั้งหมดที่ candidate อัปโหลดแล้ว
    const documents = await this.documentModel.find({
      candidate: candidateId
    }).exec();
    
    // ตรวจสอบว่ายังขาดเอกสารอะไรบ้าง
    const missingDocuments: MissingDocument[] = [];
    
    for (const service of services) {
      if (!service.RequiredDocuments || service.RequiredDocuments.length === 0) {
        continue;
      }
      
      const serviceId = service._id.toString(); // ดึง ID เป็น string
      
      for (const requiredDoc of service.RequiredDocuments) {
        // ตรวจสอบว่าเอกสารนี้จำเป็นหรือไม่
        if (!requiredDoc.required) {
          continue;
        }
        
        // ตรวจสอบว่ามีการอัปโหลดเอกสารนี้แล้วหรือยัง
        const docExists = documents.some(doc => 
          doc.service.toString() === serviceId && doc.Document_Type === requiredDoc.document_id
        );
        
        if (!docExists) {
          missingDocuments.push({
            serviceId: serviceId,
            serviceTitle: service.Service_Title,
            documentId: requiredDoc.document_id,
            documentName: requiredDoc.document_name,
            fileTypes: requiredDoc.file_types,
            maxSize: requiredDoc.max_size
          });
        }
      }
    }
    
    return {
      candidate: {
        _id: candidate._id,
        name: candidate.C_FullName,
        email: candidate.C_Email
      },
      missingDocuments
    };
  }

  async refreshDocumentUrl(documentId: string): Promise<DocumentFile> {
    const document = await this.documentModel.findById(documentId).exec();
    
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }
    
    // ดึงชื่อไฟล์จาก File_Path
    const filePath = document.File_Path;
    const filePathWithoutQuery = filePath.split('?')[0];
    const fileKey = filePathWithoutQuery.substring(filePathWithoutQuery.indexOf('/main/') + 6);
    
    // สร้าง URL ใหม่
    const newUrl = await this.filesService.getFile(fileKey);
    
    // อัปเดตข้อมูลในฐานข้อมูล
    document.File_Path = newUrl;
    
    return document.save();
  }
}