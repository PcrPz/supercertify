import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, UseInterceptors, UploadedFile, Request, ForbiddenException } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enum/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadResultDto } from './dto/upload-result.dto';
import { OrdersService } from 'src/orders/orders.service';

@Controller('api/candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService,
              private readonly ordersService: OrdersService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createCandidateDto: CreateCandidateDto) {
    return this.candidatesService.create(createCandidateDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  findAll() {
    return this.candidatesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.candidatesService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateCandidateDto: UpdateCandidateDto) {
    return this.candidatesService.update(id, updateCandidateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  remove(@Param('id') id: string) {
    return this.candidatesService.remove(id);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  async findByOrderId(@Param('orderId') orderId: string) {
    return this.candidatesService.findByOrderId(orderId);
  }
  @Post(':id/upload-result')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max size
      },
    })
  )
  async uploadResultFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadResultDto: UploadResultDto,
    @Request() req
  ) {
    return this.candidatesService.uploadResultFile(id, file, uploadResultDto, req.user.userId);
  }

  @Get('order/:orderId/results')
  @UseGuards(JwtAuthGuard)
  async findByOrderIdWithResults(
    @Param('orderId') orderId: string,
    @Request() req
  ) {
    // ตรวจสอบสิทธิ์
    const order = await this.ordersService.findOne(orderId);
    
    if (
      !req.user.roles.includes(Role.Admin) && 
      order.user._id.toString() !== req.user.userId
    ) {
      throw new ForbiddenException('You do not have permission to access these results');
    }
    
    return this.candidatesService.findByOrderIdWithResults(orderId);
  }
}