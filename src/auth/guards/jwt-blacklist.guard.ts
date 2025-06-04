// src/auth/guards/jwt-blacklist.guard.ts

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenBlacklistService } from '../services/token-blacklist.service';

@Injectable()
export class JwtBlacklistGuard extends JwtAuthGuard {
  constructor(
    private readonly tokenBlacklistService: TokenBlacklistService
  ) {
    super();
  }
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ตรวจสอบ JWT ตามปกติก่อน
    const canActivate = await super.canActivate(context);
    
    if (!canActivate) {
      return false;
    }
    
    // ตรวจสอบว่า token อยู่ใน blacklist หรือไม่
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (await this.tokenBlacklistService.isBlacklisted(user.userId)) {
      throw new UnauthorizedException('Token ถูกยกเลิกการใช้งานแล้ว กรุณาเข้าสู่ระบบใหม่');
    }
    
    return true;
  }
}