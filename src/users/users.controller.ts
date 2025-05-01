import { Controller, Get, Param, UseGuards, NotFoundException, SetMetadata, Patch, Body, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/enum/role.enum';

// สร้าง Decorator สำหรับกำหนด Roles

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile/:id')
  async getProfile(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // ไม่ส่งข้อมูล password กลับไป
    const userObject = user.toObject();
    delete userObject.password;
    
    return userObject;
  }
  
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  @Get()
  async getAllUsers() {
    const users = await this.usersService.findAll();
    return users.map(user => {
      const userObject = user.toObject();
      delete userObject.password;
      return userObject;
    });
  }
  
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  @Get('by-role/:role')
  async getUsersByRole(@Param('role') role: string) {
    const users = await this.usersService.findByRole(role);
    return users.map(user => {
      const userObject = user.toObject();
      delete userObject.password;
      return userObject;
    });
  }
  
  @UseGuards(JwtAuthGuard)
  @Roles(Role.Admin)
  @Patch(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @Request() req,
  ) {
    // ป้องกันไม่ให้ admin แก้ไข role ของตัวเอง
    if (id === req.user.userId) {
      throw new ForbiddenException('You cannot change your own role');
    }
    
    // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่ (เพิ่มความมั่นใจอีกชั้น)
    if (req.user.role !== Role.Admin) {
      throw new ForbiddenException('Only administrators can change user roles');
    }
    
    const updatedUser = await this.usersService.updateRole(id, role);
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    
    const userObject = updatedUser.toObject();
    delete userObject.password;
    
    return userObject;
  }
}
