import { IsEmail, IsNotEmpty, MinLength, IsString, IsOptional, IsEnum } from 'class-validator';

export class RegisterDto {
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
  
  @IsOptional()
  @IsEnum(['user', 'admin'], { message: 'Role must be either user or admin' })
  role?: string;
}