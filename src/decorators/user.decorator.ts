import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // แน่ใจว่ามีการ return ข้อมูล user ทั้งหมด รวมถึง roles
    return request.user;
  },
);