import { Injectable, ConflictException, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }
  
  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }
  
  async findByRole(role: string): Promise<UserDocument[]> {
    return this.userModel.find({ role }).exec();
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // ตรวจสอบว่ามี username หรือ email นี้ในระบบแล้วหรือไม่
    const existingUser = await this.userModel.findOne({
      $or: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    }).exec();

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }
  
  async updateRole(userId: string, role: string): Promise<UserDocument | null> {
    const validRoles = ['user', 'admin'];
    
    if (!validRoles.includes(role)) {
      throw new Error('Invalid role');
    }
    
    return this.userModel.findByIdAndUpdate(
      userId, 
      { role }, 
      { new: true }
    ).exec();
  }

    async deleteUser(userId: string): Promise<boolean> {
    try {
      // ลบผู้ใช้จากฐานข้อมูล
      const result = await this.userModel.findByIdAndDelete(userId).exec();
      
      // ถ้าไม่พบผู้ใช้ที่ต้องการลบ
      if (!result) {
        throw new NotFoundException('User not found');
      }
      
      return true;
    } catch (error) {
      // ถ้าเกิด error ให้ส่งต่อไปให้ controller จัดการ
      throw error;
    }
  }

    async updateProfilePicture(userId: string, profilePicture: string | null): Promise<UserDocument | null> {
      return this.userModel.findByIdAndUpdate(
        userId,
        { profilePicture },
        { new: true }
      ).exec();
    }
  
    async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserDocument | null> {
      try {
        const user = await this.userModel.findById(userId);
        
        if (!user) {
          throw new NotFoundException('User not found');
        }
        
        // ตรวจสอบว่ามีการส่งข้อมูล email มาหรือไม่ (ป้องกันเพิ่มเติม)
        if ('email' in updateProfileDto) {
          // ลบฟิลด์ email ออกเพื่อไม่ให้มีการอัปเดต
          delete updateProfileDto['email'];
        }
        
        // ตรวจสอบว่ามีการส่ง username มาหรือไม่ และตรวจสอบความซ้ำซ้อน
        if (updateProfileDto.username && updateProfileDto.username !== user.username) {
          const existingUser = await this.userModel.findOne({ 
            username: updateProfileDto.username,
            _id: { $ne: userId } // ไม่นับตัวผู้ใช้เอง
          });
          
          if (existingUser) {
            throw new ConflictException('Username already exists');
          }
        }
        
        // จัดการกับการเปลี่ยนรหัสผ่าน
        if (updateProfileDto.currentPassword && updateProfileDto.newPassword) {
          const isPasswordValid = await user.comparePassword(updateProfileDto.currentPassword);
          
          if (!isPasswordValid) {
            throw new UnauthorizedException('Current password is incorrect');
          }
          
          // รหัสผ่านจะถูกเข้ารหัสโดยอัตโนมัติด้วย pre-save hook
          user.password = updateProfileDto.newPassword;
          await user.save();
          
          // ลบรหัสผ่านออกจาก DTO เพื่อไม่ให้ถูกอัปเดตซ้ำ
          delete updateProfileDto.currentPassword;
          delete updateProfileDto.newPassword;
        } else if (
          (updateProfileDto.currentPassword && !updateProfileDto.newPassword) ||
          (!updateProfileDto.currentPassword && updateProfileDto.newPassword)
        ) {
          throw new BadRequestException('Both current password and new password are required to change password');
        }
        
        // อัปเดตข้อมูลอื่นๆ (ยกเว้น email)
        return this.userModel.findByIdAndUpdate(
          userId,
          { $set: updateProfileDto },
          { new: true }
        ).exec();
      } catch (error) {
        throw error;
      }
    }
    async updateProfileByAdmin(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserDocument | null> {
    try {
      const user = await this.userModel.findById(userId);
      
      if (!user) {
        throw new NotFoundException('User not found');
      }
      
      // ป้องกันการแก้ไขอีเมล
      if ('email' in updateProfileDto) {
        delete updateProfileDto['email'];
      }
      
      // ตรวจสอบว่ามีการส่ง username มาหรือไม่ และตรวจสอบความซ้ำซ้อน
      if (updateProfileDto.username && updateProfileDto.username !== user.username) {
        const existingUser = await this.userModel.findOne({ 
          username: updateProfileDto.username,
          _id: { $ne: userId } // ไม่นับตัวผู้ใช้เอง
        });
        
        if (existingUser) {
          throw new ConflictException('Username already exists');
        }
      }
      
      // จัดการการเปลี่ยนรหัสผ่านโดย admin
      if (updateProfileDto.newPassword) {
        // ตั้งรหัสผ่านใหม่โดยตรง
        user.password = updateProfileDto.newPassword;
        await user.save();
        
        // ลบรหัสผ่านออกจาก DTO เพื่อไม่ให้ถูกอัปเดตซ้ำ
        delete updateProfileDto.newPassword;
      }
      
      // อัปเดตข้อมูลอื่นๆ
      return this.userModel.findByIdAndUpdate(
        userId,
        { $set: updateProfileDto },
        { new: true }
      ).exec();
    } catch (error) {
      throw error;
    }
  }
}
