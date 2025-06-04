import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config'; // เพิ่ม import
import { RefreshTokenDto } from './dto/refresh-token.dto'; // เพิ่ม import
import { TokenBlacklistService } from './services/token-blacklist.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService, // เพิ่ม configService ที่นี่
    private tokenBlacklistService: TokenBlacklistService, // เพิ่ม TokenBlacklistService
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

  // อัปเดตเมธอด login เพื่อใช้งาน refresh token
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // สร้าง access token
    const accessTokenPayload = { 
      username: user.username, 
      sub: user._id, 
      roles: Array.isArray(user.role) ? user.role : [user.role]
    };
    
    // กำหนดค่า expires
    const jwtConfig = this.configService.get('jwt');
    const accessTokenExpiresIn = jwtConfig.expiresIn || '1h';
    const refreshTokenExpiresIn = jwtConfig.refreshExpiresIn || '7d';
    
    // แปลง refreshTokenExpiresIn จากสตริงเป็นวินาที
    const refreshTokenExpiresInSeconds = this.getSecondsFromExpiration(refreshTokenExpiresIn);
    
    // สร้าง refresh token
    const refreshTokenPayload = { 
      sub: user._id.toString(),
      type: 'refresh'
    };
    
    const refreshToken = this.jwtService.sign(
      refreshTokenPayload,
      { 
        secret: jwtConfig.refreshSecret,
        expiresIn: refreshTokenExpiresIn
      }
    );
    
    // บันทึก refresh token ในฐานข้อมูล
    await this.usersService.setRefreshToken(
      user._id.toString(), 
      refreshToken, 
      refreshTokenExpiresInSeconds
    );
    
    return {
      access_token: this.jwtService.sign(accessTokenPayload, {
        expiresIn: accessTokenExpiresIn
      }),
      refresh_token: refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        companyName: user.companyName,
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
        phoneNumber: user.phoneNumber,  // เพิ่มฟิลด์เบอร์โทรศัพท์
        companyName: user.companyName,  // เพิ่มฟิลด์ชื่อบริษัท
        role: user.role,
      },
    };
  }
  // เมธอดใหม่สำหรับรีเฟรช token
  async refreshAccessToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    
    try {
      // ตรวจสอบความถูกต้องของ refresh token
      const jwtConfig = this.configService.get('jwt');
      const decoded = this.jwtService.verify(refreshToken, {
        secret: jwtConfig.refreshSecret
      });
      
      // ตรวจสอบว่าเป็น refresh token จริงๆ
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }
      
      // ค้นหาผู้ใช้จาก refresh token ในฐานข้อมูล
      const user = await this.usersService.findByRefreshToken(refreshToken);
      
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      
      // สร้าง access token ใหม่
      const payload = { 
        username: user.username, 
        sub: user._id, 
        roles: Array.isArray(user.role) ? user.role : [user.role]
      };
      
      return {
        access_token: this.jwtService.sign(payload, {
          expiresIn: jwtConfig.expiresIn || '1h'
        }),
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token expired');
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // เมธอดสำหรับแปลงค่า expiresIn เป็นวินาที
  private getSecondsFromExpiration(expiresIn: string): number {
    const match = expiresIn.match(/(\d+)([smhdw])/);
    if (!match) {
      return 3600; // default 1 hour in seconds
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      case 'w': return value * 7 * 24 * 60 * 60;
      default: return 3600;
    }
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
  
  async logout(userId: string): Promise<{ success: boolean, message: string }> {
    try {
      // คำนวณเวลาหมดอายุของ token ปัจจุบัน (ใช้เวลาสูงสุดที่ access token อาจใช้งานได้)
      const jwtConfig = this.configService.get('jwt');
      const accessTokenExpiresIn = jwtConfig.expiresIn || '1h';
      const expirySeconds = this.getSecondsFromExpiration(accessTokenExpiresIn);
      
      const expiry = new Date();
      expiry.setSeconds(expiry.getSeconds() + expirySeconds);
      
      // เพิ่ม token ลงใน blacklist
      await this.tokenBlacklistService.addToBlacklist(userId, expiry);
      
      // ล้าง refresh token
      await this.usersService.clearRefreshToken(userId);
      
      return {
        success: true,
        message: 'ออกจากระบบสำเร็จ'
      };
    } catch (error) {
      console.error('Error during logout:', error);
      return {
        success: false,
        message: 'เกิดข้อผิดพลาดในการออกจากระบบ'
      };
    }
  }
}