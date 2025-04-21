import { 
  Controller, 
  Post, 
  Body, 
  ValidationPipe, 
  Get, 
  UseGuards, 
  Req 
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from 'src/decorators/user.decorator';

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

  
}