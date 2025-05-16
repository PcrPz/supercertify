import { IsEmail, IsNotEmpty, MinLength, IsString, IsOptional, IsEnum, Matches } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
  
  @IsNotEmpty()
  @IsString()
  @Matches(/^[0-9\+\-\s]+$/, { message: 'Phone number format is invalid' })
  phoneNumber: string;  // เพิ่มฟิลด์เบอร์โทรศัพท์
  
  @IsOptional()
  @IsString()
  companyName?: string;  // เพิ่มฟิลด์ชื่อบริษัท (optional)
  
  @IsOptional()
  @IsEnum(['user', 'admin'], { message: 'Role must be either user or admin' })
  role?: string;
}