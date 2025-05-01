import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/decorators/roles.decorator';
import { Role } from 'src/enum/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    
    // เพิ่มการ debug เพื่อดูค่า user ที่ได้รับ
    console.log('User in RolesGuard:', user);
    
    // ตรวจสอบว่า user มีค่าและมี roles หรือไม่
    if (!user || !user.roles) {
      console.log('User or roles is undefined:', user);
      return false;
    }
    
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}