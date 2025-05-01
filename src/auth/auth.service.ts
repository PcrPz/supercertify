import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await user.comparePassword(password)) {
      const userObject = user.toObject();
      delete userObject.password;
      return userObject;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // เปลี่ยนเป็น roles แทน role เพื่อให้สอดคล้องกับ RolesGuard
    // และใช้ userId แทน sub เพื่อให้สอดคล้องกับ JwtStrategy
    const payload = { 
      username: user.username, 
      sub: user._id, 
      roles: Array.isArray(user.role) ? user.role : [user.role] // แน่ใจว่าเป็น array เสมอ
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    
    // แก้ไขเหมือนกับ login method
    const payload = { 
      username: user.username, 
      sub: user._id, 
      roles: Array.isArray(user.role) ? user.role : [user.role] // แน่ใจว่าเป็น array เสมอ
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }
  
  async getUserProfile(user) {
    // ตรวจสอบว่ามี userId หรือไม่ (มาจาก JWT payload)
    const userId = user.userId || user.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Invalid user information');
    }
    
    const userDetails = await this.usersService.findById(userId);
    
    if (!userDetails) {
      throw new UnauthorizedException('User not found');
    }
    
    // ไม่ส่ง password กลับไป
    const { password, ...result } = userDetails.toObject();
    return result;
  }
}