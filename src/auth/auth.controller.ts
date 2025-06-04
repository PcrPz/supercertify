import { 
  Controller, 
  Post, 
  Body, 
  ValidationPipe, 
  Get, 
  UseGuards, 
  Req, 
  UnauthorizedException,
  HttpStatus
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from 'src/decorators/user.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtBlacklistGuard } from './guards/jwt-blacklist.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
  
  @Get('me')
  @UseGuards(JwtAuthGuard) // ป้องกันไม่ให้ผู้ที่ไม่ได้ Login เข้าถึง
  async getCurrentUser(@User() user) {
    // request.user จะได้จาก JwtAuthGuard
    console.log(user)
    return this.authService.getUserProfile(user)
  }
  @Post('logout')
  @UseGuards(JwtAuthGuard) // ใช้ JwtAuthGuard ธรรมดา เพราะเราต้องการให้ออกจากระบบได้แม้ token อยู่ใน blacklist
  async logout(@User() user) {
    return this.authService.logout(user.userId);
  }

  @Post('refresh-token')
  async refreshToken(@Body(ValidationPipe) refreshTokenDto: RefreshTokenDto) {
    try {
      const result = await this.authService.refreshAccessToken(refreshTokenDto);
      return {
        success: true,
        ...result,
        message: 'Token รีเฟรชสำเร็จ'
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      
      // จัดการข้อผิดพลาดต่างๆ
      if (error instanceof UnauthorizedException) {
        return {
          success: false,
          statusCode: HttpStatus.UNAUTHORIZED,
          errorCode: 'INVALID_REFRESH_TOKEN',
          message: error.message || 'Refresh token ไม่ถูกต้องหรือหมดอายุ'
        };
      }
      
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'REFRESH_TOKEN_FAILED',
        message: 'เกิดข้อผิดพลาดในการรีเฟรช token กรุณาเข้าสู่ระบบใหม่'
      };
    }
  }

  
}