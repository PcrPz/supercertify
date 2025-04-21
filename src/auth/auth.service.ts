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
    
    const payload = { username: user.username, sub: user._id, role: user.role };
    
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
    
    const payload = { email: user.email, sub: user._id, role: user.role };
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
    // user อาจมีเพียง id หรือ email ที่มาจาก JWT payload
    // จึงอาจต้องดึงข้อมูลเพิ่มเติมจากฐานข้อมูล
    const userDetails = await this.usersService.findById(user.userId);
    
    if (!userDetails) {
      throw new UnauthorizedException('User not found');
    }
    
    // ไม่ส่ง password กลับไป
    const { password, ...result } = userDetails.toObject();
    return result;
  }
}
