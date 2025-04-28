// src/orders/orders.controller.ts

import {
    Controller,
    Post,          // To handle POST requests
    Body,          // To access the request body
    UseGuards,     // To apply authentication guard
    Req,           // To access the request object (for user info)
    HttpCode,      // To set the HTTP status code on success
    HttpStatus,    // Enum for HTTP status codes
    ParseUUIDPipe, // Optional: If you needed to validate UUID format
    Logger       // For logging
  } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport'; // Use the standard Passport AuthGuard alias for 'jwt'
  import { Request } from 'express';            // Import Express Request type
  import { OrdersService } from './orders.service';
  import { CreateOrderDto } from './dto/create-order.dto'; // Import the DTO
  import { Order } from './entities/order.entity';         // Import the main entity for return type
  import { InternalServerErrorException } from '@nestjs/common'; // For specific error handling
  
  // Define an interface for the Express Request object after authentication
  // This ensures req.user is properly typed based on your JwtStrategy's payload
  interface AuthenticatedRequest extends Request {
    user: {
      sub: string; // Matches the 'sub' property returned by your JwtStrategy (Auth0 User ID)
      // Include other properties from your Auth0 JWT payload if needed
      [key: string]: any;
    };
  }
  
  @Controller('orders') // Base path for all routes in this controller will be '/orders'
  @UseGuards(AuthGuard('jwt')) // Apply JWT authentication guard to ALL routes in this controller
  export class OrdersController {
    private readonly logger = new Logger(OrdersController.name);
  
    // Inject the OrdersService
    constructor(private readonly ordersService: OrdersService) {}
  
    @Post('create') // Route will be POST /orders/create
    @HttpCode(HttpStatus.CREATED) // Set response status to 201 Created on success
    async create(
      // Use @Body() to inject the request body
      // NestJS's ValidationPipe (if configured globally) will automatically validate this against CreateOrderDto
      @Body() createOrderDto: CreateOrderDto,
      // Use @Req() to access the full request object, typed with our interface
      @Req() req: AuthenticatedRequest,
    ): Promise<Order> { // Define the return type as a Promise<Order>

        
  
      // --- Extract Buyer User ID ---
      // Access the 'user' object attached by the AuthGuard (from JwtStrategy)
  

          // --- Start Logging ---
    this.logger.log('--- Controller: /orders/create endpoint hit ---'); // <<< ADD

    const buyerUserId = req.user?.sub;
    this.logger.log(`Controller: Extracted buyerUserId: ${buyerUserId}`); // <<< ADD

    // Check if buyerUserId is actually extracted
    if (!buyerUserId) {
      this.logger.error('Controller: FAILED to extract buyerUserId from req.user.sub'); // <<< ADD
      throw new InternalServerErrorException('Authenticated user ID could not be determined.');
    }

    // Log the received DTO (careful with sensitive data in production logs)
    this.logger.debug(`Controller: Received DTO: ${JSON.stringify(createOrderDto)}`); // <<< ADD

    try {
      this.logger.log(`Controller: Attempting to call OrdersService.createOrder for user: ${buyerUserId}`); // <<< ADD
      const createdOrder = await this.ordersService.createOrder(createOrderDto, buyerUserId);
      this.logger.log(`Controller: OrdersService.createOrder SUCCEEDED. Order ID: ${createdOrder.order_id}`); // <<< ADD
      return createdOrder;
    } catch (error) {
      // This catch block handles errors thrown FROM the service call
      this.logger.error(`Controller: Error received FROM OrdersService for user ${buyerUserId}: ${error.message}`, error.stack); // <<< MODIFIED
      // Re-throw the error so NestJS handles the response
      throw error;
    }
      // Basic check to ensure the user ID was attached (should always be present if guard passed)
      if (!buyerUserId) {
        this.logger.error('User ID (sub) not found in request payload after AuthGuard passed.');
        // This indicates a potential issue with the guard or strategy configuration
        throw new InternalServerErrorException('Authenticated user ID could not be determined.');
      }
  
      this.logger.log(`Received request to create order for user: ${buyerUserId}`);
  
      // --- Call the Service Method ---
      // Pass the validated DTO and the extracted buyer user ID to the service
      try {
          const createdOrder = await this.ordersService.createOrder(createOrderDto, buyerUserId);
          this.logger.log(`Successfully created Order ID: ${createdOrder.order_id} for user ${buyerUserId}`);
          return createdOrder; // Return the newly created order object
       } catch (error) {
           // Log the error from the service before it's sent to the client
           this.logger.error(`Error during order creation for user ${buyerUserId}: ${error.message}`, error.stack);
           // Re-throw the error so NestJS's exception filters handle it
           // The service already throws specific HTTP exceptions (NotFound, Conflict, etc.)
           throw error;
        }
    } // End create method
  
    // --- Add other order-related endpoints here later if needed ---
    // E.g., GET /orders (to list user's orders)
    // GET /orders/:id (to get a specific order)
    // etc.
    // Remember to apply appropriate guards and logic
  
  } // End OrdersController class