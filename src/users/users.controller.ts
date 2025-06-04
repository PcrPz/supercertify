import { Controller, Get, Param, UseGuards, NotFoundException, Patch, Body, Request, ForbiddenException, Post, Delete, BadRequestException, UnauthorizedException, UseInterceptors, UploadedFile, ConflictException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/enum/role.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from '../files/files.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { User } from 'src/decorators/user.decorator';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private readonly filesService: FilesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile/:id')
  async getProfile(@Param('id') id: string) {
    try {
      const user = await this.usersService.findById(id);
      if (!user) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'USER_NOT_FOUND',
          message: 'ไม่พบข้อมูลผู้ใช้'
        };
      }
      
      // ไม่ส่งข้อมูล password กลับไป
      const userObject = user.toObject();
      delete userObject.password;
      
      return {
        success: true,
        data: userObject,
        message: 'ดึงข้อมูลผู้ใช้สำเร็จ'
      };
    } catch (error) {
      console.error('Error getting profile:', error);
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ กรุณาลองใหม่อีกครั้ง'
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-profile')
  async getMyProfile(@Request() req) {
    try {
      const user = await this.usersService.findById(req.user.userId);
      if (!user) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'USER_NOT_FOUND',
          message: 'ไม่พบข้อมูลผู้ใช้'
        };
      }
      
      // ไม่ส่งข้อมูล password กลับไป
      const userObject = user.toObject();
      delete userObject.password;
      
      return {
        success: true,
        data: userObject,
        message: 'ดึงข้อมูลโปรไฟล์สำเร็จ'
      };
    } catch (error) {
      console.error('Error getting my profile:', error);
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์ กรุณาลองใหม่อีกครั้ง'
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    try {
      // ป้องกันเพิ่มเติมในกรณีที่มีการส่งข้อมูล email มา
      if ('email' in updateProfileDto) {
        delete updateProfileDto['email'];
      }
      
      // ตรวจสอบว่ามีการส่ง username มาหรือไม่
      if (updateProfileDto.username) {
        // ตรวจสอบความถูกต้องของ username
        if (updateProfileDto.username.length < 3) {
          return {
            success: false,
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            errorCode: 'VALIDATION_ERROR',
            message: 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร',
            validationErrors: {
              username: 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร'
            }
          };
        }
        
        // ตรวจสอบว่า username ซ้ำหรือไม่
        const existingUser = await this.usersService.findByUsername(updateProfileDto.username);
        if (existingUser && existingUser._id.toString() !== req.user.userId) {
          return {
            success: false,
            statusCode: HttpStatus.CONFLICT,
            errorCode: 'USERNAME_ALREADY_EXISTS',
            message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น'
          };
        }
      }
      
      // ตรวจสอบการเปลี่ยนรหัสผ่าน
      if (updateProfileDto.currentPassword || updateProfileDto.newPassword) {
        // ตรวจสอบว่าใส่รหัสผ่านทั้งสองฟิลด์ครบหรือไม่
        if (!updateProfileDto.currentPassword || !updateProfileDto.newPassword) {
          return {
            success: false,
            statusCode: HttpStatus.BAD_REQUEST,
            errorCode: 'MISSING_PASSWORD_FIELDS',
            message: 'กรุณากรอกทั้งรหัสผ่านปัจจุบันและรหัสผ่านใหม่'
          };
        }
        
        // ตรวจสอบว่ารหัสผ่านใหม่มีความยาวเพียงพอหรือไม่
        if (updateProfileDto.newPassword.length < 6) {
          return {
            success: false,
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            errorCode: 'VALIDATION_ERROR',
            message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร',
            validationErrors: {
              newPassword: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
            }
          };
        }
        
        // ตรวจสอบว่ารหัสผ่านปัจจุบันถูกต้องหรือไม่
        const user = await this.usersService.findById(req.user.userId);
        
        if (!user) {
          return {
            success: false,
            statusCode: HttpStatus.NOT_FOUND,
            errorCode: 'USER_NOT_FOUND',
            message: 'ไม่พบข้อมูลผู้ใช้'
          };
        }
        
        const isPasswordValid = await user.comparePassword(updateProfileDto.currentPassword);
        
        if (!isPasswordValid) {
          return {
            success: false,
            statusCode: HttpStatus.UNAUTHORIZED,
            errorCode: 'INVALID_CURRENT_PASSWORD',
            message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
          };
        }
      }
      
      // อัปเดตข้อมูลผู้ใช้
      const updatedUser = await this.usersService.updateProfile(
        req.user.userId,
        updateProfileDto
      );
      
      if (!updatedUser) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'USER_NOT_FOUND',
          message: 'ไม่พบข้อมูลผู้ใช้'
        };
      }
      
      // ไม่ส่งข้อมูล password กลับไป
      const userObject = updatedUser.toObject();
      delete userObject.password;
      
      return {
        success: true,
        data: userObject,
        message: 'อัปเดตข้อมูลโปรไฟล์เรียบร้อยแล้ว'
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // จัดการกับ error ที่อาจเกิดจาก service
      if (error instanceof ConflictException) {
        return {
          success: false,
          statusCode: HttpStatus.CONFLICT,
          errorCode: 'USERNAME_ALREADY_EXISTS',
          message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น'
        };
      }
      
      if (error instanceof UnauthorizedException) {
        return {
          success: false,
          statusCode: HttpStatus.UNAUTHORIZED,
          errorCode: 'INVALID_CURRENT_PASSWORD',
          message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
        };
      }
      
      if (error instanceof BadRequestException) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'BAD_REQUEST',
          message: error.message || 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก'
        };
      }
      
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล กรุณาลองใหม่อีกครั้ง'
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('profilePicture'))
  async uploadProfilePicture(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      // ตรวจสอบว่ามีไฟล์ถูกอัปโหลดหรือไม่
      if (!file) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'NO_FILE_UPLOADED',
          message: 'ไม่พบไฟล์รูปภาพ กรุณาเลือกไฟล์'
        };
      }

      // ตรวจสอบประเภทไฟล์
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'INVALID_FILE_TYPE',
          message: 'ประเภทไฟล์ไม่ถูกต้อง กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น (JPEG, PNG, GIF, WEBP)'
        };
      }

      // ตรวจสอบขนาดไฟล์
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'FILE_TOO_LARGE',
          message: 'ขนาดไฟล์ใหญ่เกินไป กรุณาอัปโหลดไฟล์ขนาดไม่เกิน 5MB'
        };
      }

      // อัปโหลดไฟล์ไปยัง MinIO
      const uploadResult = await this.filesService.uploadFile(file, 'profiles');
      
      // รับ URL ของไฟล์ที่อัปโหลด
      const profilePictureUrl = await this.filesService.getFile(uploadResult.filename);
      
      // อัปเดตข้อมูลผู้ใช้
      const updatedUser = await this.usersService.updateProfilePicture(
        req.user.userId,
        profilePictureUrl
      );

      if (!updatedUser) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'USER_NOT_FOUND',
          message: 'ไม่พบข้อมูลผู้ใช้'
        };
      }

      // ไม่ส่งข้อมูล password กลับไป
      const userObject = updatedUser.toObject();
      delete userObject.password;
      
      return {
        success: true,
        data: userObject,
        message: 'อัปโหลดรูปโปรไฟล์เรียบร้อยแล้ว'
      };
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'UPLOAD_FAILED',
        message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ กรุณาลองใหม่อีกครั้ง'
      };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch('admin/user/:id')
  async updateUserByAdmin(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    try {
      // ตรวจสอบว่าผู้ใช้มีอยู่จริงหรือไม่
      const user = await this.usersService.findById(id);
      if (!user) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'USER_NOT_FOUND',
          message: 'ไม่พบข้อมูลผู้ใช้'
        };
      }
      
      // ตรวจสอบว่ามีการส่ง username มาหรือไม่
      if (updateProfileDto.username) {
        // ตรวจสอบความถูกต้องของ username
        if (updateProfileDto.username.length < 3) {
          return {
            success: false,
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            errorCode: 'VALIDATION_ERROR',
            message: 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร',
            validationErrors: {
              username: 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร'
            }
          };
        }
        
        // ตรวจสอบว่า username ซ้ำหรือไม่
        const existingUser = await this.usersService.findByUsername(updateProfileDto.username);
        if (existingUser && existingUser._id.toString() !== id) {
          return {
            success: false,
            statusCode: HttpStatus.CONFLICT,
            errorCode: 'USERNAME_ALREADY_EXISTS',
            message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น'
          };
        }
      }
      
      // ตรวจสอบการเปลี่ยนรหัสผ่าน
      if (updateProfileDto.newPassword) {
        // ตรวจสอบว่ารหัสผ่านใหม่มีความยาวเพียงพอหรือไม่
        if (updateProfileDto.newPassword.length < 6) {
          return {
            success: false,
            statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
            errorCode: 'VALIDATION_ERROR',
            message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร',
            validationErrors: {
              newPassword: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
            }
          };
        }
        
        // สำหรับ admin ไม่จำเป็นต้องใส่รหัสผ่านปัจจุบัน
        delete updateProfileDto.currentPassword;
      }
      
      // อัปเดตข้อมูลผู้ใช้โดย admin
      const updatedUser = await this.usersService.updateProfileByAdmin(
        id,
        updateProfileDto
      );
      
      if (!updatedUser) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'USER_NOT_FOUND',
          message: 'ไม่พบข้อมูลผู้ใช้'
        };
      }
      
      // ไม่ส่งข้อมูล password กลับไป
      const userObject = updatedUser.toObject();
      delete userObject.password;
      
      return {
        success: true,
        data: userObject,
        message: 'อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว'
      };
    } catch (error) {
      console.error('Error updating user by admin:', error);
      
      // จัดการกับ error ที่อาจเกิดจาก service
      if (error instanceof ConflictException) {
        return {
          success: false,
          statusCode: HttpStatus.CONFLICT,
          errorCode: 'USERNAME_ALREADY_EXISTS',
          message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่อผู้ใช้อื่น'
        };
      }
      
      if (error instanceof BadRequestException) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'BAD_REQUEST',
          message: error.message || 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก'
        };
      }
      
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล กรุณาลองใหม่อีกครั้ง'
      };
    }
  }
  
  @UseGuards(JwtAuthGuard)
  @Delete('profile-picture')
  async removeProfilePicture(@Request() req) {
    try {
      const user = await this.usersService.findById(req.user.userId);
      
      if (!user) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'USER_NOT_FOUND',
          message: 'ไม่พบข้อมูลผู้ใช้'
        };
      }
      
      // ถ้าไม่มีรูปโปรไฟล์
      if (!user.profilePicture) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'NO_PROFILE_PICTURE',
          message: 'ไม่พบรูปโปรไฟล์ที่จะลบ'
        };
      }
      
      // ถ้ามีรูปโปรไฟล์อยู่แล้ว ให้ลบไฟล์เดิม
      try {
        // แยก filename จาก URL
        const url = new URL(user.profilePicture);
        const pathParts = url.pathname.split('/');
        const filename = pathParts[pathParts.length - 1];
        
        // ลบไฟล์จาก MinIO
        await this.filesService.deleteFile(`profiles/${filename}`);
      } catch (error) {
        console.error('Failed to delete profile picture file:', error);
        // ไม่ throw error เพื่อให้สามารถลบข้อมูลในฐานข้อมูลได้ต่อ
      }
      
      // อัปเดตให้ profilePicture เป็น null
      const updatedUser = await this.usersService.updateProfilePicture(req.user.userId, null);
      
      if (!updatedUser) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'USER_NOT_FOUND',
          message: 'ไม่พบข้อมูลผู้ใช้หลังการอัปเดต'
        };
      }
      
      // ไม่ส่งข้อมูล password กลับไป
      const userObject = updatedUser.toObject();
      delete userObject.password;
      
      return {
        success: true,
        data: userObject,
        message: 'ลบรูปโปรไฟล์เรียบร้อยแล้ว'
      };
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'DELETE_FAILED',
        message: 'เกิดข้อผิดพลาดในการลบรูปโปรไฟล์ กรุณาลองใหม่อีกครั้ง'
      };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get()
  async getAllUsers() {
    try {
      const users = await this.usersService.findAll();
      
      const usersData = users.map(user => {
        const userObject = user.toObject();
        delete userObject.password;
        return userObject;
      });
      
      return {
        success: true,
        data: usersData,
        message: 'ดึงข้อมูลผู้ใช้ทั้งหมดสำเร็จ'
      };
    } catch (error) {
      console.error('Error getting all users:', error);
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'FETCH_FAILED',
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ กรุณาลองใหม่อีกครั้ง'
      };
    }
  }
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('by-role/:role')
  async getUsersByRole(@Param('role') role: string) {
    try {
      // ตรวจสอบความถูกต้องของ role
      const validRoles = ['user', 'admin'];
      if (!validRoles.includes(role)) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'INVALID_ROLE',
          message: 'บทบาทไม่ถูกต้อง กรุณาระบุ user หรือ admin'
        };
      }
      
      const users = await this.usersService.findByRole(role);
      
      const usersData = users.map(user => {
        const userObject = user.toObject();
        delete userObject.password;
        return userObject;
      });
      
      return {
        success: true,
        data: usersData,
        message: `ดึงข้อมูลผู้ใช้ที่มีบทบาท ${role} สำเร็จ`
      };
    } catch (error) {
      console.error('Error getting users by role:', error);
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'FETCH_FAILED',
        message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ตามบทบาท กรุณาลองใหม่อีกครั้ง'
      };
    }
  }
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @User() user,
  ) {
    try {
      console.log(user.userId)
      // ตรวจสอบความถูกต้องของ role
      const validRoles = ['user', 'admin'];
      if (!validRoles.includes(role)) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'INVALID_ROLE',
          message: 'บทบาทไม่ถูกต้อง กรุณาระบุ user หรือ admin'
        };
      }
      
      // ป้องกันไม่ให้ admin แก้ไข role ของตัวเอง
      if (id === user.userId) {
        return {
          success: false,
          statusCode: HttpStatus.FORBIDDEN,
          errorCode: 'CANNOT_CHANGE_OWN_ROLE',
          message: 'ไม่สามารถเปลี่ยนบทบาทของตัวเองได้'
        };
      }
      
      // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่ (เพิ่มความมั่นใจอีกชั้น)
      if (!user.roles.includes(Role.Admin)) {
        return {
          success: false,
          statusCode: HttpStatus.FORBIDDEN,
          errorCode: 'ADMIN_REQUIRED',
          message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเปลี่ยนบทบาทผู้ใช้ได้'
        };
      }
      
      const updatedUser = await this.usersService.updateRole(id, role);
      
      if (!updatedUser) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'USER_NOT_FOUND',
          message: 'ไม่พบข้อมูลผู้ใช้'
        };
      }
      
      const userObject = updatedUser.toObject();
      delete userObject.password;
      
      return {
        success: true,
        data: userObject,
        message: `เปลี่ยนบทบาทเป็น ${role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน'} เรียบร้อยแล้ว`
      };
    } catch (error) {
      console.error('Error updating user role:', error);
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'UPDATE_ROLE_FAILED',
        message: 'เกิดข้อผิดพลาดในการเปลี่ยนบทบาทผู้ใช้ กรุณาลองใหม่อีกครั้ง'
      };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @User() user
  ) {
    try {
      // ป้องกันไม่ให้ admin ลบตัวเอง
      if (id === user.userId) {
        return {
          success: false,
          statusCode: HttpStatus.FORBIDDEN,
          errorCode: 'CANNOT_DELETE_SELF',
          message: 'ไม่สามารถลบบัญชีของตัวเองได้'
        };
      }
      
      // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่ (เพิ่มความมั่นใจอีกชั้น)
      if (!user.roles.includes(Role.Admin)) {
        return {
          success: false,
          statusCode: HttpStatus.FORBIDDEN,
          errorCode: 'ADMIN_REQUIRED',
          message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบผู้ใช้ได้'
        };
      }
      
      // ดึงข้อมูลผู้ใช้ก่อนลบ (เพื่อตรวจสอบรูปโปรไฟล์)
      const userToDelete = await this.usersService.findById(id);
      
      if (!userToDelete) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'USER_NOT_FOUND',
          message: 'ไม่พบข้อมูลผู้ใช้'
        };
      }
      
      // ถ้ามีรูปโปรไฟล์ ให้ลบไฟล์ด้วย
      if (userToDelete.profilePicture) {
        try {
          // แยก filename จาก URL
          const url = new URL(userToDelete.profilePicture);
          const pathParts = url.pathname.split('/');
          const filename = pathParts[pathParts.length - 1];
          
          // ลบไฟล์จาก MinIO
          await this.filesService.deleteFile(`profiles/${filename}`);
        } catch (error) {
          console.error('Failed to delete profile picture file:', error);
          // ไม่ throw error เพื่อให้สามารถลบข้อมูลในฐานข้อมูลได้ต่อ
        }
      }
      
      // ลบผู้ใช้
      await this.usersService.deleteUser(id);
      
      return {
        success: true,
        message: 'ลบผู้ใช้เรียบร้อยแล้ว'
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'USER_NOT_FOUND',
          message: 'ไม่พบข้อมูลผู้ใช้'
        };
      }
      
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'DELETE_USER_FAILED',
        message: 'เกิดข้อผิดพลาดในการลบผู้ใช้ กรุณาลองใหม่อีกครั้ง'
      };
    }
  }
}