import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';

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
}