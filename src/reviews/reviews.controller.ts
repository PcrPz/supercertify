import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  UseGuards, 
  HttpStatus, 
  ForbiddenException, 
  NotFoundException, 
  BadRequestException,
  Query  // เพิ่ม Query ตรงนี้
} from '@nestjs/common';
import { QueryReviewDto } from './dto/query-review.dto';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto, AdminUpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '../enum/role.enum';
import { User } from '../decorators/user.decorator';

@Controller('api/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createReviewDto: CreateReviewDto, @User() user) {
    try {
      const review = await this.reviewsService.create(createReviewDto, user.userId);
      
      return {
        success: true,
        data: review,
        message: 'Review created successfully'
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return {
          success: false,
          statusCode: HttpStatus.FORBIDDEN,
          errorCode: 'FORBIDDEN',
          message: error.message
        };
      }
      
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'NOT_FOUND',
          message: error.message
        };
      }
      
      if (error instanceof BadRequestException) {
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'BAD_REQUEST',
          message: error.message
        };
      }
      
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Error creating review'
      };
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async findAll(@Query() query: QueryReviewDto) {
    try {
      const reviews = await this.reviewsService.findAll(query);
      
      return {
        success: true,
        data: reviews,
        message: 'Reviews retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Error retrieving reviews'
      };
    }
  }

  @Get('public')
  async findAllPublic(@Query() query: QueryReviewDto) {
    try {
      const reviews = await this.reviewsService.findAllPublic(query);
      
      return {
        success: true,
        data: reviews,
        message: 'Public reviews retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Error retrieving public reviews'
      };
    }
  }
  
  @Get('featured')
  async findFeaturedReviews() {
    try {
      const reviews = await this.reviewsService.findFeaturedReviews();
      
      return {
        success: true,
        data: reviews,
        message: 'Featured reviews retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Error retrieving featured reviews'
      };
    }
  }

  @Get('stats')
  async getStats() {
    try {
      const stats = await this.reviewsService.getStats();
      
      return {
        success: true,
        data: stats,
        message: 'Review statistics retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Error retrieving review statistics'
      };
    }
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  async findByOrderId(@Param('orderId') orderId: string, @User() user) {
    try {
      const reviews = await this.reviewsService.findByOrderId(orderId);
      
      return {
        success: true,
        data: reviews,
        message: 'Reviews for order retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Error retrieving reviews for order'
      };
    }
  }

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  async findMyReviews(@User() user) {
    try {
      const reviews = await this.reviewsService.findByUserId(user.userId);
      
      return {
        success: true,
        data: reviews,
        message: 'Your reviews retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Error retrieving your reviews'
      };
    }
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async findByUserId(@Param('userId') userId: string) {
    try {
      const reviews = await this.reviewsService.findByUserId(userId);
      
      return {
        success: true,
        data: reviews,
        message: 'User reviews retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Error retrieving user reviews'
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const review = await this.reviewsService.findOne(id);
      
      return {
        success: true,
        data: review,
        message: 'Review retrieved successfully'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'NOT_FOUND',
          message: error.message
        };
      }
      
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Error retrieving review'
      };
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto, @User() user) {
    try {
      const review = await this.reviewsService.update(id, updateReviewDto, user.userId);
      
      return {
        success: true,
        data: review,
        message: 'Review updated successfully'
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return {
          success: false,
          statusCode: HttpStatus.FORBIDDEN,
          errorCode: 'FORBIDDEN',
          message: error.message
        };
      }
      
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'NOT_FOUND',
          message: error.message
        };
      }
      
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Error updating review'
      };
    }
  }

  @Put(':id/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async adminUpdate(@Param('id') id: string, @Body() adminUpdateReviewDto: AdminUpdateReviewDto, @User() user) {
    try {
      const review = await this.reviewsService.adminUpdate(id, adminUpdateReviewDto, user.userId);
      
      return {
        success: true,
        data: review,
        message: 'Review updated by admin successfully'
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'NOT_FOUND',
          message: error.message
        };
      }
      
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Error updating review'
      };
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @User() user) {
    try {

      const isAdmin = user.roles?.includes(Role.Admin);

      await this.reviewsService.remove(id, user.userId, isAdmin);
      
      return {
        success: true,
        message: 'Review deleted successfully'
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return {
          success: false,
          statusCode: HttpStatus.FORBIDDEN,
          errorCode: 'FORBIDDEN',
          message: error.message
        };
      }
      
      if (error instanceof NotFoundException) {
        return {
          success: false,
          statusCode: HttpStatus.NOT_FOUND,
          errorCode: 'NOT_FOUND',
          message: error.message
        };
      }
      
      return {
        success: false,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Error deleting review'
      };
    }
  }
}