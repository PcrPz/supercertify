// dto/update-profile.dto.ts
import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateProfileDto {
  // ลบฟิลด์ email ออกเพื่อไม่ให้ผู้ใช้เปลี่ยนแปลงได้
  @IsOptional()
  @IsString()
  username?: string; // เพิ่มฟิลด์ username
  
  @IsOptional()
  @IsString()
  @Matches(/^[0-9\+\-\s]+$/, { message: 'Phone number format is invalid' })
  phoneNumber?: string;
  
  @IsOptional()
  @IsString()
  companyName?: string;
  
  @IsOptional()
  @IsString()
  @MinLength(6)
  currentPassword?: string;
  
  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;
}