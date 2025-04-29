// src/orders/orders.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  Get, // Added for GET requests
  Patch, // Added for PATCH requests
  Param, // Added for URL parameters
  ParseIntPipe, // Added for parsing numeric URL parameters
  Query // Added for query parameters
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { SellerOrder } from './entities/seller-order.entity'; // Import SellerOrder
import { InternalServerErrorException, ForbiddenException, BadRequestException } from '@nestjs/common';
// Import DTO for status update (will create later)
// import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

// Define interface for request object after authentication
interface AuthenticatedRequest extends Request {
  user: {
    sub: string; // Auth0 User ID
    [key: string]: any;
  };
}

@Controller('orders') // Base path remains '/orders'
@UseGuards(AuthGuard('jwt')) // Apply guard to all routes
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  // --- Route for Buyers to Create Orders ---
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Order> {
    this.logger.log('--- Controller: /orders/create endpoint hit ---');
    const buyerUserId = req.user?.sub;
    this.logger.log(`Controller: Extracted buyerUserId: ${buyerUserId}`);
    if (!buyerUserId) {
      this.logger.error('Controller: FAILED to extract buyerUserId from req.user.sub');
      throw new InternalServerErrorException('Authenticated user ID could not be determined.');
    }
    this.logger.debug(`Controller: Received DTO: ${JSON.stringify(createOrderDto)}`);
    try {
      this.logger.log(`Controller: Attempting to call OrdersService.createOrder for user: ${buyerUserId}`);
      const createdOrder = await this.ordersService.createOrder(createOrderDto, buyerUserId);
      this.logger.log(`Controller: OrdersService.createOrder SUCCEEDED. Order ID: ${createdOrder.orderId}`);
      return createdOrder;
    } catch (error) {
      this.logger.error(`Controller: Error received FROM OrdersService during creation for user ${buyerUserId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  // --- NEW Route for Sellers to Get Their Orders ---
  @Get('my-seller-orders') // Route: GET /orders/my-seller-orders
  async getMySellerOrders(
    @Req() req: AuthenticatedRequest,
  ): Promise<SellerOrder[]> {
    const sellerUserId = req.user?.sub;
    this.logger.log(`--- Controller: /orders/my-seller-orders endpoint hit by user: ${sellerUserId} ---`);
    if (!sellerUserId) {
      this.logger.error('Controller: FAILED to extract sellerUserId from req.user.sub for getMySellerOrders');
      throw new InternalServerErrorException('Authenticated user ID could not be determined.');
    }
    try {
      return await this.ordersService.findSellerOrders(sellerUserId);
    } catch (error) {
       this.logger.error(`Controller: Error received FROM OrdersService during getMySellerOrders for user ${sellerUserId}: ${error.message}`, error.stack);
       throw error; // Re-throw service errors
    }
  }

  // --- Placeholder route for Seller Earnings ---
  @Get('my-seller-earnings')
  async getMySellerEarnings(
      @Req() req: AuthenticatedRequest,
      @Query('status') status?: string // Optional query param like /orders/my-seller-earnings?status=Completed
  ): Promise<{ totalEarnings: number }> {
      const sellerUserId = req.user?.sub;
      this.logger.log(`--- Controller: /orders/my-seller-earnings endpoint hit by user: ${sellerUserId}, status filter: ${status} ---`);
      if (!sellerUserId) { throw new InternalServerErrorException('Authenticated user ID could not be determined.'); }
      // TODO: Add validation for status if needed (e.g., IsEnum)
      return this.ordersService.calculateSellerEarnings(sellerUserId, status);
  }

  // --- Placeholder route for Seller Updating Status ---
  @Patch('seller/:id/status') // Route: PATCH /orders/seller/123/status
  async updateSellerOrderStatus(
      @Req() req: AuthenticatedRequest,
      @Param('id', ParseIntPipe) sellerOrderId: number, // Get ID from URL and parse as integer
      @Body() updateOrderStatusDto: { status: string } // Simple body DTO for now
      // TODO: Replace ^ with a proper DTO: @Body() updateOrderStatusDto: UpdateOrderStatusDto
  ): Promise<SellerOrder> {
      const sellerUserId = req.user?.sub;
      const newStatus = updateOrderStatusDto.status; // Get status from body
      this.logger.log(`--- Controller: PATCH /orders/seller/${sellerOrderId}/status endpoint hit by user: ${sellerUserId} with status: ${newStatus} ---`);
      if (!sellerUserId) { throw new InternalServerErrorException('Authenticated user ID could not be determined.'); }
      if (!newStatus) { throw new BadRequestException('Status is required in the request body.'); } // Basic validation
      // TODO: Add validation for allowed status values using the DTO

      // Call service, passing ID, owner ID, and new status
      return this.ordersService.updateSellerOrderStatus(sellerOrderId, sellerUserId, newStatus);
  }

} // End OrdersController class
