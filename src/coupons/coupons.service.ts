// src/coupons/coupons.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Coupon, CouponDocument, CouponType } from './schemas/coupon.schema';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CreatePublicCouponDto } from './dto/create-public-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
  ) {}

  // ฟังก์ชันอื่นๆ คงเดิม...
  async create(createCouponDto: CreateCouponDto): Promise<Coupon> {
    if (createCouponDto.code) {
      const existingCoupon = await this.couponModel.findOne({ code: createCouponDto.code }).exec();
      if (existingCoupon) {
        throw new ConflictException(`Coupon with code ${createCouponDto.code} already exists`);
      }
    }
    
    const newCoupon = new this.couponModel({
      ...createCouponDto,
      expiryDate: new Date(createCouponDto.expiryDate)
    });
    
    return newCoupon.save();
  }

  async createPublicCoupon(createPublicCouponDto: CreatePublicCouponDto): Promise<Coupon> {
    if (createPublicCouponDto.code) {
      const existingCoupon = await this.couponModel.findOne({ code: createPublicCouponDto.code }).exec();
      if (existingCoupon) {
        throw new ConflictException(`Coupon with code ${createPublicCouponDto.code} already exists`);
      }
    }
    
    const newCoupon = new this.couponModel({
      ...createPublicCouponDto,
      expiryDate: new Date(createPublicCouponDto.expiryDate),
      isPublic: true,
      isClaimable: true,
      remainingClaims: createPublicCouponDto.remainingClaims || -1,
      // ✅ ใช้ couponType จาก DTO หรือ default เป็น PUBLIC
      couponType: createPublicCouponDto.couponType || CouponType.PUBLIC
    });
    
    return newCoupon.save();
  }

  async findAll(): Promise<Coupon[]> {
    return this.couponModel.find().exec();
  }

  async findPublicCoupons(): Promise<Coupon[]> {
    return this.couponModel.find({
      isPublic: true,
      isActive: true,
      isClaimable: true,
      expiryDate: { $gt: new Date() },
      couponType: CouponType.PUBLIC, // ✅ เฉพาะ PUBLIC type เท่านั้น
      $or: [
        { remainingClaims: -1 },
        { remainingClaims: { $gt: 0 } }
      ]
    }).exec();
  }
  
  async findSurveyCoupons(): Promise<Coupon[]> {
    return this.couponModel.find({
      isPublic: true,
      isActive: true,
      isClaimable: true,
      expiryDate: { $gt: new Date() },
      couponType: CouponType.SURVEY,
      $or: [
        { remainingClaims: -1 },
        { remainingClaims: { $gt: 0 } }
      ]
    }).exec();
  }

  async findOne(id: string): Promise<Coupon> {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
    return coupon;
  }

  async findByCode(code: string): Promise<Coupon> {
    const coupon = await this.couponModel.findOne({ code }).exec();
    if (!coupon) {
      throw new NotFoundException(`Coupon with code ${code} not found`);
    }
    return coupon;
  }

  async update(id: string, updateCouponDto: UpdateCouponDto): Promise<Coupon> {
    if (updateCouponDto.code) {
      const existingCoupon = await this.couponModel.findOne({ 
        code: updateCouponDto.code,
        _id: { $ne: id }
      }).exec();
      
      if (existingCoupon) {
        throw new ConflictException(`Coupon with code ${updateCouponDto.code} already exists`);
      }
    }
    
    const updateData: any = { ...updateCouponDto };
    if (updateData.expiryDate) {
      updateData.expiryDate = new Date(updateData.expiryDate);
    }
    
    const updatedCoupon = await this.couponModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).exec();
    
    if (!updatedCoupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
    
    return updatedCoupon;
  }

  async remove(id: string): Promise<void> {
    const result = await this.couponModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
  }

  async markAsUsed(id: string, orderId?: string): Promise<Coupon> {
    console.log('🔄 Marking coupon as used:', { couponId: id, orderId });
    
    const updateData: any = {
      isUsed: true,
      usedAt: new Date()
    };
    
    if (orderId) {
      updateData.usedInOrder = new Types.ObjectId(orderId);
    }
    
    const updatedCoupon = await this.couponModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).exec();
    
    if (!updatedCoupon) {
      console.error('❌ Coupon not found for marking as used:', id);
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }
    
    console.log('✅ Coupon marked as used successfully:', {
      id: updatedCoupon._id,
      code: updatedCoupon.code,
      isUsed: updatedCoupon.isUsed,
      usedAt: updatedCoupon.usedAt,
      usedInOrder: updatedCoupon.usedInOrder
    });
    
    return updatedCoupon;
  }


  async claimCoupon(couponId: string, userId: string): Promise<Coupon> {
    try {
      console.log('🔍 Claiming coupon:', { couponId, userId });
      
      // ตรวจสอบ input
      if (!couponId || !userId) {
        throw new BadRequestException('ข้อมูลไม่ครบถ้วน');
      }

      // หาคูปองต้นฉบับ
      const coupon = await this.couponModel.findById(couponId).exec();
      
      if (!coupon) {
        throw new NotFoundException(`ไม่พบคูปองที่มี ID: ${couponId}`);
      }
      
      console.log('📋 Found coupon:', {
        id: coupon._id,
        code: coupon.code,
        isPublic: coupon.isPublic,
        isActive: coupon.isActive,
        isClaimable: coupon.isClaimable
      });
      
      // ตรวจสอบสิทธิ์
      if (!coupon.isActive || !coupon.isClaimable || !coupon.isPublic) {
        throw new BadRequestException('คูปองนี้ไม่สามารถเก็บได้');
      }
      
      // ตรวจสอบอายุ
      if (new Date() > coupon.expiryDate) {
        throw new BadRequestException('คูปองนี้หมดอายุแล้ว');
      }
      
      // ตรวจสอบจำนวนที่เหลือ
      if (coupon.remainingClaims !== -1 && coupon.remainingClaims <= 0) {
        throw new BadRequestException('คูปองนี้ถูกเก็บครบจำนวนแล้ว');
      }
      
      // ตรวจสอบว่าเคลมแล้วหรือยัง
      const existingClaim = await this.couponModel.findOne({
        originalCouponId: new Types.ObjectId(couponId),
        claimedBy: new Types.ObjectId(userId)
      }).exec();
      
      if (existingClaim) {
        throw new BadRequestException('คุณเคยเก็บคูปองนี้แล้ว');
      }
      
      console.log('✅ All validations passed, creating user coupon...');
      
      // สร้างคูปองส่วนตัว
      const userCoupon = new this.couponModel({
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        expiryDate: coupon.expiryDate,
        isActive: true,
        description: coupon.description || '',
        claimedBy: new Types.ObjectId(userId),
        claimedAt: new Date(),
        isPublic: false,
        isClaimable: false,
        originalCouponId: new Types.ObjectId(couponId),
        couponType: coupon.couponType // ✅ คัดลอก couponType ด้วย
      });
      
      // บันทึกคูปองส่วนตัว
      const savedUserCoupon = await userCoupon.save();
      console.log('💾 User coupon saved:', savedUserCoupon._id);
      
      // อัปเดตจำนวนที่เหลือ (ถ้ามีจำกัด)
      if (coupon.remainingClaims !== -1) {
        await this.couponModel.findByIdAndUpdate(
          couponId,
          { remainingClaims: coupon.remainingClaims - 1 },
          { new: true }
        ).exec();
        console.log('📊 Updated remaining claims');
      }
      
      console.log('🎉 Coupon claimed successfully');
      return savedUserCoupon;
      
    } catch (error) {
      console.error('❌ Error in claimCoupon service:', error);
      throw error; // ส่ง error ต่อไปให้ Controller จัดการ
    }
  }

  async findUserCoupons(userId: string, includeUsed: boolean = false): Promise<Coupon[]> {
    console.log('🔍 Finding user coupons:', { userId, includeUsed });
    
    const filter: any = {
      claimedBy: new Types.ObjectId(userId),
      isActive: true,
      expiryDate: { $gt: new Date() }
    };
    
    // ✅ ถ้าไม่ต้องการคูปองที่ใช้แล้ว ให้กรองออก
    if (!includeUsed) {
      filter.isUsed = false;
    }
    
    const userCoupons = await this.couponModel.find(filter)
      .populate('usedInOrder')
      .sort({ claimedAt: -1 })
      .exec();
    
    console.log(`📊 Found ${userCoupons.length} user coupons (includeUsed: ${includeUsed})`);
    
    return userCoupons;
  }

  // ✅ แก้ไข validateCoupon - ปัญหาหลักอยู่ตรงนี้
  async validateCoupon(code, afterPromotionPrice, userId?: string): Promise<Coupon> {
    try {
      console.log('🔍 Validating coupon:', { code, afterPromotionPrice, userId });
      
      // ตรวจสอบ input parameters
      if (!code || typeof code !== 'string') {
        throw new BadRequestException('รหัสคูปองไม่ถูกต้อง');
      }
      
      if (typeof afterPromotionPrice !== 'number' || afterPromotionPrice <= 0) {
        throw new BadRequestException('ยอดเงินไม่ถูกต้อง');
      }
      
      const cleanCode = code.trim().toUpperCase();
      
      // ✅ ขั้นตอนที่ 1: หาคูปองส่วนตัวของ user ก่อน (ถ้ามี userId)
      if (userId) {
        console.log('🔍 Looking for personal coupon first...');
        const personalCoupon = await this.couponModel.findOne({
          code: cleanCode,
          claimedBy: new Types.ObjectId(userId),
          isUsed: false,
          isActive: true
        }).exec();
        
        if (personalCoupon) {
          console.log('✅ Found personal coupon:', personalCoupon._id);
          
          // ตรวจสอบอายุ
          if (new Date() > personalCoupon.expiryDate) {
            throw new BadRequestException('คูปองนี้หมดอายุแล้ว');
          }
          
          console.log('✅ Personal coupon validation successful');
          return personalCoupon;
        }
      }
      
      // ✅ ขั้นตอนที่ 2: ถ้าไม่เจอคูปองส่วนตัว ให้หาคูปองสาธารณะ
      console.log('🔍 Looking for public coupon...');
      let publicCoupon;
      try {
        publicCoupon = await this.findByCode(cleanCode);
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new BadRequestException('ไม่พบคูปองนี้ในระบบ');
        }
        throw error;
      }
      
      console.log('📋 Found public coupon:', {
        id: publicCoupon._id,
        code: publicCoupon.code,
        isActive: publicCoupon.isActive,
        isUsed: publicCoupon.isUsed,
        isPublic: publicCoupon.isPublic,
        isClaimable: publicCoupon.isClaimable
      });
      
      // ตรวจสอบคูปองสาธารณะ
      if (!publicCoupon.isActive) {
        throw new BadRequestException('คูปองนี้ไม่สามารถใช้งานได้');
      }
      
      if (new Date() > publicCoupon.expiryDate) {
        throw new BadRequestException('คูปองนี้หมดอายุแล้ว');
      }
      
      // ✅ ถ้าเป็นคูปองสาธารณะ ต้องตรวจสอบว่า user เคลมแล้วหรือยัง
      if (publicCoupon.isPublic) {
        if (!userId) {
          throw new BadRequestException('กรุณาเข้าสู่ระบบเพื่อใช้คูปอง');
        }
        
        console.log('🔍 Checking if user claimed this public coupon...');
        const userClaimedCoupon = await this.couponModel.findOne({
          originalCouponId: publicCoupon._id,
          claimedBy: new Types.ObjectId(userId),
          isUsed: false,
          isActive: true
        }).exec();
        
        if (!userClaimedCoupon) {
          throw new BadRequestException('คุณยังไม่ได้เคลมคูปองนี้ กรุณาเคลมก่อนใช้งาน');
        }
        
        console.log('✅ Found user claimed coupon:', userClaimedCoupon._id);
        
        // ตรวจสอบอายุของคูปองที่เคลมแล้ว
        if (new Date() > userClaimedCoupon.expiryDate) {
          throw new BadRequestException('คูปองนี้หมดอายุแล้ว');
        }
        
        console.log('✅ Public coupon validation successful - returning claimed coupon');
        return userClaimedCoupon; // ✅ คืนค่าคูปองที่ user เคลมแล้ว ไม่ใช่คูปองต้นฉบับ
      }
      
      // ถ้าเป็นคูปองส่วนตัวธรรมดา (ไม่ใช่สาธารณะ)
      if (publicCoupon.claimedBy) {
        if (!userId || publicCoupon.claimedBy.toString() !== userId) {
          throw new BadRequestException('คูปองนี้ไม่ใช่ของคุณ');
        }
      }
      
      if (publicCoupon.isUsed) {
        throw new BadRequestException('คูปองนี้ถูกใช้ไปแล้ว');
      }
      
      console.log('✅ Coupon validation successful');
      return publicCoupon;
      
    } catch (error) {
      console.error('❌ Coupon validation failed:', error.message);
      throw error;
    }
  }

  calculateDiscount(coupon: Coupon, afterPromotionPrice: number): number {
    const discountAmount = (afterPromotionPrice * coupon.discountPercent) / 100;
    return Math.floor(discountAmount);
  }
  
  async findSurveyCouponByUser(userId: string): Promise<Coupon | null> {
    const coupon = await this.couponModel.findOne({
      claimedBy: new Types.ObjectId(userId),
      couponType: CouponType.SURVEY
    }).exec();
    
    return coupon;
  }

  async releaseCoupon(orderId: string): Promise<void> {
  console.log('🔄 Releasing coupons for deleted order:', orderId);
  
  try {
    // หาคูปองที่ใช้ใน Order นี้
    const usedCoupons = await this.couponModel.find({
      usedInOrder: new Types.ObjectId(orderId),
      isUsed: true
    }).exec();
    
    if (usedCoupons.length === 0) {
      console.log('ℹ️ No coupons found for order:', orderId);
      return;
    }
    
    console.log(`🎫 Found ${usedCoupons.length} coupon(s) to release:`, 
      usedCoupons.map(c => ({ id: c._id, code: c.code }))
    );
    
    // Reset สถานะคูปองทั้งหมดที่ใช้ใน Order นี้
    const updateResult = await this.couponModel.updateMany(
      {
        usedInOrder: new Types.ObjectId(orderId),
        isUsed: true
      },
      {
        $set: {
          isUsed: false,
          usedAt: null,
          usedInOrder: null
        }
      }
    ).exec();
    
    console.log(`✅ Released ${updateResult.modifiedCount} coupon(s) successfully`);
    
    // Log รายละเอียดคูปองที่ถูก release
    usedCoupons.forEach(coupon => {
      console.log(`🎫 Coupon released: ${coupon.code} (ID: ${coupon._id})`);
    });
    
  } catch (error) {
    console.error('❌ Error releasing coupons:', error);
    // ไม่ throw error เพื่อไม่ให้กระทบกับการลบ Order
  }
}


  async findReleasedCoupons(limit: number = 50): Promise<Coupon[]> {
    // หาคูปองที่เคยถูกใช้แล้วแต่ถูก release (usedAt มีค่าแต่ isUsed เป็น false)
    return this.couponModel.find({
      isUsed: false,
      usedAt: { $ne: null }, // เคยถูกใช้
      usedInOrder: null
    })
    .sort({ usedAt: -1 }) // เรียงตามเวลาที่ถูกใช้ล่าสุด
    .limit(limit)
    .exec();
  }

  async createSurveyCoupon(userId: string): Promise<Coupon> {
    // ตรวจสอบว่า user เคยรับ survey coupon แล้วหรือยัง
    const existingSurveyCoupon = await this.findSurveyCouponByUser(userId);
    
    if (existingSurveyCoupon) {
      throw new BadRequestException('คุณเคยรับคูปองจากแบบสอบถามแล้ว');
    }
    
    // สร้างรหัสคูปองที่ไม่ซ้ำ
    const randomCode = await this.generateUniqueSurveyCode();
    
    // กำหนดวันหมดอายุ (3 เดือนจากปัจจุบัน)
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 3);
    
    // สร้างคูปองส่วนตัวโดยตรง (ไม่ผ่านการเคลม)
    const newCoupon = new this.couponModel({
      code: randomCode,
      discountPercent: 15,
      expiryDate: expiryDate,
      description: 'คูปองส่วนลดจากการทำแบบสอบถาม',
      isActive: true,
      isPublic: false, // ตั้งเป็น false เพราะเป็นคูปองส่วนตัว
      isClaimable: false, // ไม่ต้องเคลม
      couponType: CouponType.SURVEY,
      claimedBy: new Types.ObjectId(userId),
      claimedAt: new Date()
    });
    
    return newCoupon.save();
  }

    private async generateUniqueSurveyCode(): Promise<string> {
    const prefix = 'SUR';
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const numbers = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const code = `${prefix}${numbers}`;
      
      try {
        const existingCoupon = await this.couponModel.findOne({ code }).exec();
        
        if (!existingCoupon) {
          return code;
        }
        
        attempts++;
      } catch (error) {
        attempts++;
      }
    }
    
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${timestamp}`;
  }
}