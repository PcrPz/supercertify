import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model ,Schema as MongooseSchema} from 'mongoose';
import * as bcrypt from 'bcrypt';

// สร้าง interface สำหรับเมธอดที่เราจะเพิ่มเข้าไป
export interface UserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ประกาศ UserDocument ที่รวม User, Document และ UserMethods
export type UserDocument = User & Document & UserMethods;

// สร้าง interface สำหรับ UserModel
export type UserModel = Model<UserDocument>;

@Schema({
  timestamps: true,
})
export class User {

  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: any;

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  phoneNumber: string;  // เพิ่มฟิลด์เบอร์โทรศัพท์
  
  @Prop({ required: false })
  companyName: string;  // เพิ่มฟิลด์ชื่อบริษัท

  @Prop({ default: true })
  isActive: boolean;
  
  @Prop({ type: String, enum: ['user', 'admin'], default: 'user' })
  role: string;

  @Prop({ default: null })
  profilePicture: string; // เก็บ URL ของรูปโปรไฟล์

  @Prop({ default: null })
  refreshToken: string;

  @Prop({ default: null })
  refreshTokenExp: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// เพิ่ม methods สำหรับการเข้ารหัสและตรวจสอบรหัสผ่าน
UserSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// เพิ่ม method สำหรับเปรียบเทียบรหัสผ่าน
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};