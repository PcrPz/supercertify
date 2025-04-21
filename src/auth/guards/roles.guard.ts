import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    // ถ้าไม่ได้กำหนด roles ที่ต้องการ ให้อนุญาตเข้าถึง
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    // ตรวจสอบว่ามีข้อมูล user จาก JwtAuthGuard หรือไม่
    if (!user) {
      throw new UnauthorizedException('User information is missing');
    }
    
    // ตรวจสอบว่าผู้ใช้มี role ที่ต้องการหรือไม่
    return requiredRoles.includes(user.role);
  }
}