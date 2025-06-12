import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto, AdminUpdateReviewDto } from './dto/update-review.dto';
import { OrdersService } from '../orders/orders.service';
import { QueryReviewDto } from './dto/query-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    private ordersService: OrdersService,
  ) {}

  async create(createReviewDto: CreateReviewDto, userId: string): Promise<Review> {
    // 1. ตรวจสอบว่า Order มีอยู่จริงหรือไม่
    const order = await this.ordersService.findOne(createReviewDto.orderId);
    
    if (!order) {
      throw new NotFoundException(`Order with ID ${createReviewDto.orderId} not found`);
    }
    
    // 2. ตรวจสอบว่าผู้ใช้เป็นเจ้าของ Order หรือไม่
    if (order.user._id.toString() !== userId) {
      throw new ForbiddenException('You do not have permission to review this order');
    }
    
    // 3. ตรวจสอบว่า Order อยู่ในสถานะ completed หรือไม่
    if (order.OrderStatus !== 'completed') {
      throw new BadRequestException('You can only review completed orders');
    }
    
    // 4. ตรวจสอบว่าเคย Review Order นี้ไปแล้วหรือไม่
    const existingReview = await this.reviewModel.findOne({
      order: createReviewDto.orderId,
      user: userId,
    }).exec();
    
    if (existingReview) {
      throw new BadRequestException('You have already reviewed this order');
    }
    
    // 5. เก็บข้อมูลเพิ่มเติมของ Order และ User
    const orderDetails = {
      orderType: order.OrderType,
      totalPrice: order.TotalPrice,
      orderDate: new Date(), // แก้ไขจาก order.createdAt
      services: order.services,
      trackingNumber: order.TrackingNumber
    };
    
    const userDetails = {
      username: order.user.username,
      email: order.user.email,
      fullName: order.user.username, // แก้ไขจาก order.user.fullName เป็น username
      profilePicture: order.user.profilePicture
    };
    
    // 6. สร้าง Review ใหม่
    const newReview = new this.reviewModel({
      order: createReviewDto.orderId,
      user: userId,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
      isPublic: createReviewDto.isPublic !== undefined ? createReviewDto.isPublic : true,
      tags: createReviewDto.tags || [],
      orderDetails,
      userDetails,
    });
    
    // 7. บันทึก Review
    const savedReview = await newReview.save();
    
    // 8. อัปเดตสถานะการ Review ของ Order
    await this.ordersService.markOrderAsReviewed(createReviewDto.orderId, savedReview._id.toString());
    
    return savedReview;
  }

// reviews.service.ts
async findAll(query: QueryReviewDto = {}): Promise<Review[]> {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    minRating,
    search,
    isPublic,
    isDisplayed  // เพิ่มการรับพารามิเตอร์ isDisplayed
  } = query;

  // สร้าง filter object สำหรับใช้ใน query
  const filter: any = {};
  
  // เพิ่มเงื่อนไขการกรองตาม minRating
  if (minRating !== undefined) {
    filter.rating = { $gte: minRating };
  }
  
  // เพิ่มเงื่อนไขการกรองตาม isPublic
  if (isPublic !== undefined) {
    filter.isPublic = isPublic;
  }
  
  // เพิ่มเงื่อนไขการกรองตาม isDisplayed
  if (isDisplayed !== undefined) {
    filter.isDisplayed = isDisplayed;
  }
  
  // เพิ่มเงื่อนไขการค้นหา
  if (search) {
    filter.$or = [
      { comment: { $regex: search, $options: 'i' } },
      { 'userDetails.username': { $regex: search, $options: 'i' } },
      { 'userDetails.fullName': { $regex: search, $options: 'i' } },
      { 'orderDetails.trackingNumber': { $regex: search, $options: 'i' } }
    ];
  }

  // คำนวณ skip สำหรับการแบ่งหน้า
  const skip = (page - 1) * limit;
  
  // ตั้งค่าการเรียงลำดับ
  const sortOptions: any = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.reviewModel.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate('user', '-password')
    .populate('order')
    .exec();
}

async findAllPublic(query: QueryReviewDto = {}): Promise<Review[]> {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    minRating,
    search,
    isDisplayed  // เพิ่มการรับพารามิเตอร์ isDisplayed
  } = query;

  // สร้าง filter object สำหรับใช้ใน query
  const filter: any = { isPublic: true };
  
  // เพิ่มเงื่อนไขการกรองตาม minRating
  if (minRating !== undefined) {
    filter.rating = { $gte: minRating };
  }
  
  // เพิ่มเงื่อนไขการกรองตาม isDisplayed
  if (isDisplayed !== undefined) {
    filter.isDisplayed = isDisplayed;
  }
  
  // เพิ่มเงื่อนไขการค้นหา
  if (search) {
    filter.$or = [
      { comment: { $regex: search, $options: 'i' } },
      { 'userDetails.username': { $regex: search, $options: 'i' } },
      { 'userDetails.fullName': { $regex: search, $options: 'i' } },
      { 'orderDetails.trackingNumber': { $regex: search, $options: 'i' } }
    ];
  }

  // คำนวณ skip สำหรับการแบ่งหน้า
  const skip = (page - 1) * limit;
  
  // ตั้งค่าการเรียงลำดับ
  const sortOptions: any = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.reviewModel.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate('user', '-password')
    .populate('order')
    .exec();
}
  
  // เพิ่มเมธอดสำหรับดึง Review ที่ถูกเลือกให้แสดงบนหน้าเว็บหลัก
    async findFeaturedReviews(): Promise<Review[]> {
    return this.reviewModel.find({ 
        isPublic: true,
        // ลบเงื่อนไข isVerified: true ออก
        isDisplayed: true 
    })
        .sort({ createdAt: -1 })
        .populate('user', '-password')
        .populate('order')
        .exec();
    }

  async findByOrderId(orderId: string): Promise<Review[]> {
    return this.reviewModel.find({ order: orderId })
      .populate('user', '-password')
      .populate('order')
      .exec();
  }

  async findByUserId(userId: string): Promise<Review[]> {
    return this.reviewModel.find({ user: userId })
      .populate('user', '-password')
      .populate('order')
      .exec();
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewModel.findById(id)
      .populate('user', '-password')
      .populate('order')
      .exec();
    
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }
    
    return review;
  }

    async update(id: string, updateReviewDto: UpdateReviewDto, userId: string): Promise<Review> {
    console.log(`Updating review ${id} by user ${userId}`);
    
    // ตรวจสอบว่า Review มีอยู่หรือไม่
    const review = await this.reviewModel.findById(id);
    if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
    }
    
    // แสดงข้อมูล Review ปัจจุบันและผู้ใช้ที่กำลังอัปเดต
    console.log('Current review:', {
        id: review._id,
        user: review.user,
        order: review.order,
        rating: review.rating,
        comment: review.comment
    });
    
    // เปลี่ยนเงื่อนไขการตรวจสอบสิทธิ์ - อนุญาตให้อัปเดตได้เฉพาะเจ้าของ Review หรือ Admin
    // แปลง ObjectId เป็น string เพื่อเปรียบเทียบ
    const reviewUserIdStr = review.user.toString();
    console.log(`Comparing review user ID ${reviewUserIdStr} with updater ID ${userId}`);
    
    // ตรวจสอบว่าผู้ใช้เป็นเจ้าของ Review หรือไม่
    // ถ้าคุณมีการตรวจสอบบทบาท Admin ตรงนี้ให้เพิ่มเงื่อนไขด้วย
    if (reviewUserIdStr !== userId) {
        // ถ้าต้องการเช็คว่าเป็น Admin ให้เพิ่มเงื่อนไขตรงนี้
        // เช่น if (reviewUserIdStr !== userId && !isAdmin) {
        console.log('Permission denied: User is not the owner of this review');
        throw new ForbiddenException('You do not have permission to update this review');
    }
    
    // ทำการอัปเดต Review
    const updatedReview = await this.reviewModel.findByIdAndUpdate(
        id,
        updateReviewDto,
        { new: true }
    )
    .populate('user')
    .populate('order')
    .exec();
    
    if (!updatedReview) {
        throw new NotFoundException(`Review with ID ${id} not found after update`);
    }
    
    console.log('Review updated successfully');
    
    return updatedReview;
    }

    async adminUpdate(id: string, adminUpdateReviewDto: AdminUpdateReviewDto, adminId: string): Promise<Review | null> {
    // 1. ตรวจสอบว่า Review มีอยู่จริงหรือไม่
    await this.findOne(id);
    
    // 2. สร้างข้อมูลที่จะอัปเดต
    const updateData: any = { ...adminUpdateReviewDto };
    
    // 4. ถ้ามีการเพิ่มการตอบกลับจาก Admin
    if (adminUpdateReviewDto.adminResponse !== undefined) {
        updateData.adminResponseBy = adminId;
        updateData.adminResponseAt = new Date();
    }
    
    // 5. อัปเดต Review
    return this.reviewModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
    )
    .populate('user', '-password')
    .populate('order')
    .exec();
    }

  async remove(id: string, userId: string, isAdmin: boolean = false): Promise<void> {
    // 1. ตรวจสอบว่า Review มีอยู่จริงหรือไม่
    const review = await this.findOne(id);
    
    // 2. ตรวจสอบว่าผู้ใช้เป็นเจ้าของ Review หรือไม่
    if (!isAdmin) {
        const reviewUserId = review.user.toString ? review.user.toString() : 
                            (review.user as any)._id ? (review.user as any)._id.toString() : review.user;
        
        if (reviewUserId !== userId) {
        throw new ForbiddenException('You do not have permission to delete this review');
        }
    }
    
    // 3. ลบ Review
    const result = await this.reviewModel.deleteOne({ _id: id }).exec();
    
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }
  }

async getStats(): Promise<any> {
  const aggregationResults = await this.reviewModel.aggregate([
    {
      $facet: {
        // นับจำนวนรีวิวทั้งหมด
        "totalCount": [{ $count: "count" }],
        
        // นับจำนวนรีวิวตามสถานะต่างๆ
        "statusCounts": [
          {
            $group: {
              _id: {
                isPublic: "$isPublic",
                isDisplayed: "$isDisplayed"  // ลบ isVerified ออก
              },
              count: { $sum: 1 }
            }
          }
        ],
        
        // คำนวณคะแนนเฉลี่ยของรีวิวที่เผยแพร่
        "averageRating": [
          { 
            $match: { 
              isPublic: true
              // ลบเงื่อนไข isVerified: true ออก
            } 
          },
          {
            $group: {
              _id: null,
              average: { $avg: "$rating" },
              count: { $sum: 1 }
            }
          }
        ],
        
        // คำนวณการกระจายของคะแนน
        "distribution": [
          { 
            $match: { 
              isPublic: true
              // ลบเงื่อนไข isVerified: true ออก 
            } 
          },
          {
            $group: {
              _id: "$rating",
              count: { $sum: 1 }
            }
          }
        ],
        
        // นับจำนวนรีวิวที่มีการตอบกลับ
        "respondedCount": [
          { 
            $match: { 
              adminResponse: { $ne: null } 
            } 
          },
          { $count: "count" }
        ]
      }
    }
  ]).exec();
  
  // แปลงผลลัพธ์ให้อยู่ในรูปแบบที่ต้องการ
  const result = aggregationResults[0];
  
  // นับจำนวนรีวิวทั้งหมด
  const totalReviews = result.totalCount[0]?.count || 0;
  
  // ประมวลผลสถานะต่างๆ
  let publishedCount = 0;
  let pendingCount = 0;
  let featuredCount = 0;
  
  result.statusCounts.forEach(statusGroup => {
    const { isPublic, isDisplayed } = statusGroup._id;
    
    if (isPublic === true) {
      publishedCount += statusGroup.count;
      
      if (isDisplayed === true) {  // ลบเงื่อนไข isVerified ออก
        featuredCount += statusGroup.count;
      }
    } else {
      pendingCount += statusGroup.count;
    }
  });
  
  // ประมวลผลคะแนนเฉลี่ย
  const averageRating = result.averageRating[0]?.average || 0;
  
  // ประมวลผลการกระจายของคะแนน
  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  };
  
  result.distribution.forEach(item => {
    distribution[item._id] = item.count;
  });
  
  // นับจำนวนรีวิวที่มีการตอบกลับ
  const respondedCount = result.respondedCount[0]?.count || 0;
  
  return {
    totalReviews,
    publishedCount,
    pendingCount,
    featuredCount,
    averageRating,
    distribution,
    respondedCount
  };
}
}