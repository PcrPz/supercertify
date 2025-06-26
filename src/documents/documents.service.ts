// src/documents/documents.service.ts - แก้ไขเต็มๆ
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
    private servicesService: ServicesService
  ) {}

  // ✅ เพิ่ม normalizeDocumentType function ที่หายไป
  private normalizeDocumentType(documentType: string): string {
    const typeMapping: { [key: string]: string } = {
      // National ID variations  
      'copy_of_national_id_card_social': 'national_id',
      'copy_of_national_id_card': 'national_id',
      'national_id_card_social': 'national_id',
      'national_id_card': 'national_id',
      'id_card_social': 'national_id',
      'id_card': 'national_id',
      
      // Passport variations
      'copy_of_passport': 'passport',
      'passport_copy': 'passport',
      'passport': 'passport',
      
      // Criminal check variations
      'criminal_background_check': 'criminal_check',
      'criminal_record_check': 'criminal_check',
      'criminal_check': 'criminal_check',
      'criminal_record': 'criminal_check',
      'background_check': 'criminal_check',
      
      // Education variations
      'education_verification': 'education_verify',
      'education_certificate': 'education_verify',
      'education_verify': 'education_verify',
      'education_check': 'education_verify',
      'education_degree': 'education_verify',
      
      // Work permit variations
      'work_permit_copy': 'work_permit',
      'work_permit': 'work_permit',
      'employment_permit': 'work_permit',
      
      // House registration variations
      'house_registration_copy': 'house_registration',
      'house_registration': 'house_registration',
      'address_registration': 'house_registration',
      'residence_registration': 'house_registration'
    };
    
    // ลองหาใน mapping ก่อน (ตรงตัว)
    if (typeMapping[documentType.toLowerCase()]) {
      return typeMapping[documentType.toLowerCase()];
    }
    
    // ถ้าไม่เจอ ให้ทำความสะอาดและหาอีกครั้ง
    const cleanId = documentType.toLowerCase().replace(/[^a-z_]/g, '');
    if (typeMapping[cleanId]) {
      return typeMapping[cleanId];
    }
    
    // ถ้ายังไม่เจอ ให้ทำความสะอาดและตัดให้สั้น
    return documentType
      .toLowerCase()
      .replace(/[^a-z_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 20);
  }

  // ✅ Helper function สำหรับทำความสะอาดชื่อไฟล์ (เก็บ underscore)
  private sanitizeFileName(name: string): string {
    return name
      .trim()
      .replace(/[^a-zA-Z0-9ก-๙\s_]/g, '') // ✅ เก็บ underscore ด้วย
      .replace(/\s+/g, '_') // แทนที่ช่องว่างด้วย _
      .replace(/_+/g, '_') // แทนที่ __ หลายตัวด้วย _
      .replace(/^_|_$/g, '') // ลบ _ ที่ขึ้นต้นและลงท้าย
      .substring(0, 30); // เพิ่มกลับเป็น 30
  }

  // ✅ Helper function สำหรับสร้างชื่อไฟล์ที่สวย
  private createBeautifulFileName(
    candidate: any, 
    documentType: string, 
    originalFileName: string, 
    index?: number
  ): string {
    const cleanCandidateName = this.sanitizeFileName(`${candidate.C_FirstName} ${candidate.C_LastName}`.trim());
    const cleanDocumentType = this.sanitizeFileName(documentType); // ✅ เปลี่ยนกลับเป็น sanitizeFileName
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const uuid = randomUUID().split('-')[0]; // เอาแค่ 8 ตัวแรก
    const fileExtension = originalFileName.split('.').pop()?.toLowerCase() || '';
    
    // ถ้ามีหลายไฟล์ ให้เพิ่มหมายเลข
    const fileNumber = index !== undefined ? `_${index + 1}` : '';
    
    return `${cleanDocumentType}_${cleanCandidateName}_${timestamp}_${uuid}${fileNumber}.${fileExtension}`;
  }

  async uploadDocument(file: Express.Multer.File, uploadDocumentDto: UploadDocumentDto): Promise<DocumentFile> {
    console.log('📄 Starting document upload process...');
    
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

    // ✅ 6. สร้างชื่อไฟล์ที่สวยและดูรู้เรื่อง
    const beautifulFileName = this.createBeautifulFileName(
      candidate, 
      uploadDocumentDto.documentType, 
      file.originalname
    );
    
    console.log('📄 Beautiful filename created:', beautifulFileName);

    // 7. ตรวจสอบว่ามีเอกสารประเภทนี้อยู่แล้วหรือไม่ (ก่อนอัปโหลด)
    const existingDocument = await this.documentModel.findOne({
      candidate: uploadDocumentDto.candidateId,
      service: uploadDocumentDto.serviceId,
      Document_Type: uploadDocumentDto.documentType
    }).exec();

    // ✅ ลบไฟล์เก่าถ้ามี
    if (existingDocument?.File_Path) {
      try {
        const oldUrlParts = existingDocument.File_Path.split('/static/');
        if (oldUrlParts.length > 1) {
          await this.filesService.deleteFile(oldUrlParts[1]);
          console.log('🗑️ Deleted old document file');
        }
      } catch (error) {
        console.error('Failed to delete old document file:', error);
      }
    }

    // 8. อัปโหลดไฟล์ไปยัง MinIO
    const folder = `documents/${uploadDocumentDto.candidateId}/${uploadDocumentDto.serviceId}/${uploadDocumentDto.documentType}`;
    
    const uploadResult = await this.filesService.uploadFile(file, folder, beautifulFileName);
    const fileUrl = uploadResult.url; // ✅ ใช้จาก uploadResult
    
    console.log('✅ File uploaded successfully:', fileUrl);

    // 9. บันทึก/อัปเดตข้อมูลเอกสาร
    if (existingDocument) {
      // อัปเดตเอกสารที่มีอยู่
      existingDocument.File_Path = fileUrl;
      existingDocument.File_Name = beautifulFileName; // ✅ ใช้ชื่อไฟล์ที่สวย
      existingDocument.Original_Name = file.originalname; // ✅ เก็บชื่อเดิมไว้
      existingDocument.File_Type = file.mimetype;
      existingDocument.File_Size = file.size;
      existingDocument.isVerified = false;
      existingDocument.verifiedAt = null;
      existingDocument.verifiedBy = null;
      
      return existingDocument.save();
    } else {
      // สร้างเอกสารใหม่
      const documentFile = new this.documentModel({
        File_ID: randomUUID(),
        File_Path: fileUrl,
        File_Name: beautifulFileName, // ✅ ใช้ชื่อไฟล์ที่สวย
        Original_Name: file.originalname, // ✅ เก็บชื่อเดิมไว้
        File_Type: file.mimetype,
        File_Size: file.size,
        Document_Type: uploadDocumentDto.documentType,
        candidate: uploadDocumentDto.candidateId,
        service: uploadDocumentDto.serviceId,
        isVerified: uploadDocumentDto.isVerified || false
      });

      return documentFile.save();
    }
  }

  // ✅ อัปเดต uploadMultipleDocuments ด้วย
  async uploadMultipleDocuments(files: Express.Multer.File[], uploadDocumentDto: UploadDocumentDto): Promise<DocumentFile[]> {
    console.log('📄 Starting multiple documents upload process...');
    
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

    const uploadedDocuments: DocumentFile[] = [];
    const folder = `documents/${uploadDocumentDto.candidateId}/${uploadDocumentDto.serviceId}/${uploadDocumentDto.documentType}`;

    // 4. วนลูปแต่ละไฟล์
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 4.1 ตรวจสอบประเภทไฟล์
      const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
      if (!requiredDocument.file_types.includes(fileExtension)) {
        throw new BadRequestException(
          `File type "${fileExtension}" is not allowed. Allowed types: ${requiredDocument.file_types.join(', ')}`
        );
      }

      // 4.2 ตรวจสอบขนาดไฟล์
      if (requiredDocument.max_size && file.size > requiredDocument.max_size) {
        throw new BadRequestException(
          `File size (${file.size} bytes) exceeds the maximum allowed size (${requiredDocument.max_size} bytes)`
        );
      }

      // ✅ 4.3 สร้างชื่อไฟล์ที่สวยสำหรับไฟล์หลายตัว
      const beautifulFileName = this.createBeautifulFileName(
        candidate, 
        uploadDocumentDto.documentType, 
        file.originalname, 
        i // เพิ่มหมายเลขไฟล์
      );

      const uploadResult = await this.filesService.uploadFile(file, folder, beautifulFileName);
      const fileUrl = uploadResult.url; // ✅ ใช้จาก uploadResult

      // 4.4 ตรวจสอบว่ามีเอกสารประเภทนี้อยู่แล้วหรือไม่
      const existingDocument = await this.documentModel.findOne({
        candidate: uploadDocumentDto.candidateId,
        service: uploadDocumentDto.serviceId,
        Document_Type: uploadDocumentDto.documentType
      }).exec();

      let document: DocumentFile;
      
      if (existingDocument) {
        // อัปเดตเอกสารที่มีอยู่
        existingDocument.File_Path = fileUrl;
        existingDocument.File_Name = beautifulFileName; // ✅ ใช้ชื่อไฟล์ที่สวย
        existingDocument.Original_Name = file.originalname; // ✅ เก็บชื่อเดิมไว้
        existingDocument.File_Type = file.mimetype;
        existingDocument.File_Size = file.size;
        existingDocument.isVerified = false;
        existingDocument.verifiedAt = null;
        existingDocument.verifiedBy = null;
        
        document = await existingDocument.save();
      } else {
        // สร้างเอกสารใหม่
        const documentFile = new this.documentModel({
          File_ID: randomUUID(),
          File_Path: fileUrl,
          File_Name: beautifulFileName, // ✅ ใช้ชื่อไฟล์ที่สวย
          Original_Name: file.originalname, // ✅ เก็บชื่อเดิมไว้
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
    
    // ✅ ลบไฟล์จาก MinIO ด้วย
    if (document.File_Path) {
      try {
        const urlParts = document.File_Path.split('/static/');
        if (urlParts.length > 1) {
          await this.filesService.deleteFile(urlParts[1]);
        }
      } catch (error) {
        console.error('Failed to delete document file:', error);
      }
    }
    
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
    
    // จัดกลุ่มตาม service
    const serviceDocuments = {};
    
    for (const doc of documents) {
      const serviceId = doc.service.toString();
      
      if (!serviceDocuments[serviceId]) {
        try {
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
        fileName: doc.File_Name, // ✅ ชื่อไฟล์ที่สวย
        originalName: doc.Original_Name || doc.File_Name, // ✅ ชื่อไฟล์เดิม
        filePath: doc.File_Path,
        isVerified: doc.isVerified,
        uploadedAt: (doc as any).createdAt || new Date()
      });
    }
    
    return {
      candidate: {
        _id: candidate._id,
        name: `${candidate.C_FirstName} ${candidate.C_LastName}`.trim(),
        email: candidate.C_Email,
        company: candidate.C_Company_Name
      },
      serviceDocuments: Object.values(serviceDocuments)
    };
  }

  async getMissingDocuments(candidateId: string): Promise<any> {
    const candidate = await this.candidatesService.findOne(candidateId);
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${candidateId} not found`);
    }
    
    // หาบริการทั้งหมดที่ candidate ใช้
    const services = await Promise.all(
      candidate.services.map(serviceId => {
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
      
      const serviceId = service._id.toString();
      
      for (const requiredDoc of service.RequiredDocuments) {
        if (!requiredDoc.required) {
          continue;
        }
        
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
        name: `${candidate.C_FirstName} ${candidate.C_LastName}`.trim(),
        email: candidate.C_Email
      },
      missingDocuments
    };
  }

  // ✅ อัปเดต refreshDocumentUrl ให้ใช้ static URL
  async refreshDocumentUrl(documentId: string): Promise<DocumentFile> {
    const document = await this.documentModel.findById(documentId).exec();
    
    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }
    
    // ถ้าเป็น static URL แล้ว ไม่ต้องทำอะไร
    if (document.File_Path.includes('/files/static/')) {
      return document;
    }
    
    // ถ้ายังเป็น presigned URL เก่า ให้แปลงเป็น static URL
    const urlParts = document.File_Path.split('/static/');
    if (urlParts.length > 1) {
      const newUrl = this.filesService.getFileUrl(urlParts[1]);
      document.File_Path = newUrl;
      return document.save();
    }
    
    return document;
  }
}