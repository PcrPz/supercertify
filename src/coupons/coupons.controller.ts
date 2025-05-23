// src/coupons/coupons.controller.ts - เฉพาะส่วนที่ต้องแก้

import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, BadRequestException, InternalServerErrorException, Query } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CreatePublicCouponDto } from './dto/create-public-coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enum/role.enum';
import { User } from 'src/decorators/user.decorator';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Coupon, CouponDocument } from './schemas/coupon.schema';

@Controller('api/coupons')
export class CouponsController {
  constructor(
    private readonly couponsService: CouponsService,
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument> // เพิ่ม inject model
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  create(@Body() createCouponDto: CreateCouponDto) {
    return this.couponsService.create(createCouponDto);
  }

  @Post('public')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  createPublicCoupon(@Body() createPublicCouponDto: CreatePublicCouponDto) {
    return this.couponsService.createPublicCoupon(createPublicCouponDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  findAll() {
    return this.couponsService.findAll();
  }

  @Get('public')
  @UseGuards(JwtAuthGuard)
  async findPublicCoupons(@User() user) {
    try {
      // ดึงคูปองสาธารณะที่ยังเคลมได้และยังไม่หมดอายุ
      const publicCoupons = await this.couponsService.findPublicCoupons();
      
      // หากมี User เข้าสู่ระบบ ให้ตรวจสอบว่าเคลมคูปองไปแล้วหรือยัง
      if (user && user.userId) {
        // ดึงคูปองที่ User เคลมแล้ว โดยตรวจสอบจาก originalCouponId
        const claimedCoupons = await this.couponModel.find({
          claimedBy: new Types.ObjectId(user.userId),
          originalCouponId: { $ne: null } // ต้องมี originalCouponId
        }).exec();
        
        // สร้างรายการ ID ของคูปองต้นฉบับที่ User เคลมไปแล้ว
        const claimedOriginalIds = claimedCoupons.map(coupon => 
          coupon.originalCouponId.toString()
        );
        
        // เพิ่มข้อมูลว่าคูปองใดถูกเคลมแล้ว
        const publicCouponsWithClaimInfo = publicCoupons.map(coupon => {
          const isClaimed = claimedOriginalIds.includes(coupon._id.toString());
          const couponObj = JSON.parse(JSON.stringify(coupon)); // แปลงเป็น plain object
          return {
            ...couponObj,
            isClaimed,
            canClaim: !isClaimed
          };
        });
        
        return publicCouponsWithClaimInfo;
      }
      
      // หากไม่มี User เข้าสู่ระบบ แสดงข้อมูลคูปองทั่วไป
      return publicCoupons.map(coupon => {
        const couponObj = JSON.parse(JSON.stringify(coupon)); // แปลงเป็น plain object
        return {
          ...couponObj,
          isClaimed: false,
          canClaim: true
        };
      });
    } catch (error) {
      console.error('Error in findPublicCoupons:', error);
      throw new BadRequestException('ไม่สามารถดึงข้อมูลคูปองสาธารณะได้');
    }
  }


  @Get('claimed-status')
  @UseGuards(JwtAuthGuard)
  async getClaimedStatus(@User() user, @Query('couponIds') couponIdsString: string) {
    if (!couponIdsString) {
      return {};
    }
    
    const couponIds = couponIdsString.split(',');
    
    // ดึงคูปองที่ User เคลมแล้ว
    const claimedCoupons = await this.couponModel.find({
      claimedBy: new Types.ObjectId(user.userId)
    }).exec();
    
    // สร้างรายการ ID ของคูปองต้นฉบับที่ User เคลมไปแล้ว
    const claimedOriginalIds = claimedCoupons.map(coupon => 
      coupon.originalCouponId ? coupon.originalCouponId.toString() : null
    ).filter(Boolean);
    
    // ดึงข้อมูลคูปองสาธารณะตาม ID
    const publicCoupons = await this.couponModel.find({
      _id: { $in: couponIds.map(id => new Types.ObjectId(id)) }
    }).exec();
    
    // สร้าง Map ของสถานะการเคลม
    const result = {};
    publicCoupons.forEach(coupon => {
      result[coupon._id.toString()] = {
        isClaimed: claimedOriginalIds.includes(coupon._id.toString()),
        code: coupon.code
      };
    });
    
    return result;
  }

@Post('claim/:id')
@UseGuards(JwtAuthGuard)
async claimCoupon(@Param('id') id: string, @Request() req) {
  try {
    console.log('🎫 Claiming coupon:', { 
      couponId: id, 
      hasUser: !!req.user,
      user: req.user,
      userId: req.user?.userId 
    });
    
    // ✅ ใช้ req.user แทน
    const user = req.user;
    
    if (!user || !user.userId) {
      console.error('❌ No user found in request');
      return {
        success: false,
        message: 'กรุณาเข้าสู่ระบบใหม่',
        error: 'No user authentication'
      };
    }
    
    if (!id || id.length !== 24) {
      console.error('❌ Invalid coupon ID:', id);
      return {
        success: false,
        message: 'รหัสคูปองไม่ถูกต้อง',
        error: 'Invalid coupon ID'
      };
    }
    
    const userCoupon = await this.couponsService.claimCoupon(id, user.userId);
    
    if (!userCoupon) {
      console.error('❌ Service returned null');
      return {
        success: false,
        message: 'ไม่สามารถเก็บคูปองได้',
        error: 'Service returned null'
      };
    }
    
    console.log('✅ Coupon claimed successfully:', userCoupon._id);
    
    const response = {
      success: true,
      message: 'เก็บคูปองสำเร็จ',
      coupon: {
        _id: userCoupon._id?.toString() || '',
        code: userCoupon.code || '',
        discountPercent: userCoupon.discountPercent || 0,
        description: userCoupon.description || '',
        expiryDate: userCoupon.expiryDate || new Date(),
        claimedAt: userCoupon.claimedAt || new Date()
      }
    };
    
    console.log('📤 Sending response:', response);
    return response;
    
  } catch (error) {
    console.error('❌ Error in claimCoupon:', error);
    
    const errorResponse = {
      success: false,
      message: error.message || 'ไม่สามารถเก็บคูปองได้',
      error: error.name || 'Unknown error'
    };
    
    console.log('📤 Sending error response:', errorResponse);
    return errorResponse;
  }
}

  @Get('my-coupons')
  @UseGuards(JwtAuthGuard)
  async findMyCoupons(@User() user, @Query('includeUsed') includeUsed?: string) {
    try {
      // ✅ รับ parameter จาก query string
      const shouldIncludeUsed = includeUsed === 'true';
      
      const myCoupons = await this.couponsService.findUserCoupons(
        user.userId, 
        shouldIncludeUsed
      );
      
      return myCoupons.map(coupon => ({
        _id: coupon._id,
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        description: coupon.description,
        expiryDate: coupon.expiryDate,
        claimedAt: coupon.claimedAt,
        isUsed: coupon.isUsed,
        usedAt: coupon.usedAt
      }));
    } catch (error) {
      console.error('Error in findMyCoupons:', error);
      throw new BadRequestException('ไม่สามารถดึงข้อมูลคูปองของคุณได้');
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return this.couponsService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }

  @Post('check')
  @UseGuards(JwtAuthGuard) // ✅ ต้องมี JwtAuthGuard เพื่อให้ได้ user info
  async checkCoupon(
    @Body() body: { code: string, subtotal: number, promotionDiscount: number },
    @User() user // ✅ ต้องได้ user info มาด้วย
  ) {
    const { code, subtotal, promotionDiscount } = body;
    
    console.log('🔍 Coupon check request:', {
      code,
      subtotal,
      promotionDiscount,
      userId: user?.userId
    });
    
    // ตรวจสอบ input
    if (!code || !code.trim()) {
      throw new BadRequestException('กรุณากรอกรหัสคูปอง');
    }
    
    if (typeof subtotal !== 'number' || subtotal <= 0) {
      throw new BadRequestException('ยอดรวมไม่ถูกต้อง');
    }
    
    if (typeof promotionDiscount !== 'number' || promotionDiscount < 0) {
      throw new BadRequestException('ส่วนลดโปรโมชั่นไม่ถูกต้อง');
    }
    
    const afterPromotionPrice = subtotal - promotionDiscount;
    
    if (afterPromotionPrice <= 0) {
      throw new BadRequestException('ยอดเงินหลังหักส่วนลดต้องมากกว่า 0');
    }
    
    try {
      // ✅ ส่ง userId ไปด้วยเพื่อให้ validateCoupon หาคูปองส่วนตัวได้
      const coupon = await this.couponsService.validateCoupon(
        code.trim(), 
        afterPromotionPrice,
        user?.userId // ✅ ส่ง userId ไปด้วย
      );
      
      console.log('✅ Coupon validation successful:', coupon._id);
      
      // คำนวณส่วนลด
      const discountAmount = this.couponsService.calculateDiscount(coupon, afterPromotionPrice);
      
      const response = {
        coupon: {
          _id: coupon._id,
          code: coupon.code,
          discountPercent: coupon.discountPercent,
          description: coupon.description
        },
        discountAmount
      };
      
      console.log('✅ Coupon check response:', response);
      
      return response;
    } catch (error) {
      console.error('❌ Coupon check error:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  @Get('survey')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async findSurveyCoupons() {
    return this.couponsService.findSurveyCoupons();
  }


  @Post('survey-coupon')
  @UseGuards(JwtAuthGuard)
  async createSurveyCoupon(@User() user) {
    try {
      // ✅ ใช้ method ใหม่ที่จัดการ survey coupon โดยเฉพาะ
      const userCoupon = await this.couponsService.createSurveyCoupon(user.userId);
      
      return {
        success: true,
        alreadyClaimed: false,
        message: 'รับคูปองส่วนลดสำเร็จ',
        coupon: {
          _id: userCoupon._id,
          code: userCoupon.code,
          discountPercent: userCoupon.discountPercent,
          description: userCoupon.description,
          expiryDate: userCoupon.expiryDate,
          claimedAt: userCoupon.claimedAt
        }
      };
      
    } catch (error) {
      console.error('Error in createSurveyCoupon:', error);
      
      // ✅ จัดการ error กรณีเคยรับแล้ว
      if (error.message === 'คุณเคยรับคูปองจากแบบสอบถามแล้ว') {
        const existingCoupon = await this.couponsService.findSurveyCouponByUser(user.userId);
        
        return {
          success: true,
          alreadyClaimed: true,
          message: 'คุณเคยรับคูปองจากแบบสอบถามแล้ว',
          coupon: existingCoupon ? {
            _id: existingCoupon._id,
            code: existingCoupon.code,
            discountPercent: existingCoupon.discountPercent,
            description: existingCoupon.description,
            expiryDate: existingCoupon.expiryDate,
            claimedAt: existingCoupon.claimedAt
          } : null
        };
      }
      
      return {
        success: false,
        alreadyClaimed: false,
        message: error.message || 'เกิดข้อผิดพลาดในการสร้างคูปอง',
        error: true
      };
    }
  }



  @Post('easy-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async createEasyCodeCoupon(@Body() body: { 
    prefix?: string, 
    discountPercent: number, 
    expiryDate: string,
    description?: string,
    remainingClaims?: number
  }) {
    const code = await this.generateUniqueEasyCode(body.prefix || '', 6);
    
    return this.couponsService.createPublicCoupon({
      ...body,
      code,
      isActive: true
    });
  }
  @Get('released')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async findReleasedCoupons() {
    return this.couponsService.findReleasedCoupons();
  }

// ฟังก์ชันสร้างรหัสคูปองทั่วไปแบบไม่ซ้ำ
  private async generateUniqueEasyCode(prefix: string = '', length: number = 6): Promise<string> {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      let result = prefix;
      
      if (prefix && !prefix.endsWith('-')) {
        result += '-';
      }
      
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      try {
        const existingCoupon = await this.couponModel.findOne({ code: result }).exec();
        
        if (!existingCoupon) {
          return result;
        }
        
        attempts++;
      } catch (error) {
        attempts++;
      }
    }
    
    const timestamp = Date.now().toString().slice(-6);
    const fallbackResult = prefix ? `${prefix}-${timestamp}` : `COUP${timestamp}`;
    return fallbackResult;
  }
  @Get('admin/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getAdminCouponOverview() {
    try {
      // ดึงคูปองทั้งหมด
      const allCoupons = await this.couponModel.find().exec();
      
      // แยกประเภทคูปอง
      const publicCoupons = allCoupons.filter(c => 
        c.isPublic && !c.claimedBy && c.couponType === 'PUBLIC'
      );
      const surveyCoupons = allCoupons.filter(c => 
        c.isPublic && !c.claimedBy && c.couponType === 'SURVEY'
      );
      const claimedCoupons = allCoupons.filter(c => c.claimedBy);
      const usedCoupons = allCoupons.filter(c => c.isUsed);
      
      // นับจำนวนตามประเภท
      const claimedByCouponType = {
        PUBLIC: claimedCoupons.filter(c => c.couponType === 'PUBLIC').length,
        SURVEY: claimedCoupons.filter(c => c.couponType === 'SURVEY').length,
        PRIVATE: claimedCoupons.filter(c => c.couponType === 'PRIVATE').length,
        SPECIAL: claimedCoupons.filter(c => c.couponType === 'SPECIAL').length
      };
      
      return {
        total: allCoupons.length,
        byType: {
          public: publicCoupons.length,
          survey: surveyCoupons.length,
          claimed: claimedCoupons.length,
          used: usedCoupons.length
        },
        claimedByType: claimedByCouponType,
        publicCoupons: publicCoupons.map(c => ({
          _id: c._id,
          code: c.code,
          discountPercent: c.discountPercent,
          description: c.description,
          expiryDate: c.expiryDate,
          remainingClaims: c.remainingClaims,
          isActive: c.isActive,
          createdAt: c.createdAt
        })),
        surveyCoupons: surveyCoupons.map(c => ({
          _id: c._id,
          code: c.code,
          discountPercent: c.discountPercent,
          description: c.description,
          expiryDate: c.expiryDate,
          remainingClaims: c.remainingClaims,
          isActive: c.isActive,
          createdAt: c.createdAt
        }))
      };
    } catch (error) {
      console.error('Error in getAdminCouponOverview:', error);
      throw new BadRequestException('ไม่สามารถดึงข้อมูลภาพรวมคูปองได้');
    }
  }
}