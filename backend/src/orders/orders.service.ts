// src/orders/orders.service.ts

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ConflictException, // For stock issues
  Logger, // For logging
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm'; // Import DataSource for transactions
import { Order } from './entities/order.entity';
import { SellerOrder } from './entities/seller-order.entity';
import { SellerOrderItem } from './entities/seller-order-item.entity';
import { Product } from '../products/entities/product.entity'; // Adjust path
import { Store } from '../store/entities/store.entity'; // Adjust path
import { CartItem } from '../cart/entities/cart-item.entity'; // Adjust path for clearing cart
import { CreateOrderDto, CartItemDto } from './dto/create-order.dto'; // Adjust path


@Injectable()
export class OrdersService {
  // Inject DataSource to manage transactions and OrderRepository to fetch the final result
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    // CartItem Repo is technically needed for the type in queryRunner.manager.delete
    // but doesn't need to be injected here unless used elsewhere.
    // Keeping it for clarity based on previous code.
    @InjectRepository(CartItem)
    private cartItemsRepository: Repository<CartItem>,
  ) {}

  // Logger instance for better debugging/monitoring
  private readonly logger = new Logger(OrdersService.name);

  // Helper function to group cart items by storeId
  private groupItemsByStore(items: CartItemDto[]): Record<string, CartItemDto[]> {
    return items.reduce((acc, item) => {
      const storeId = item.storeId.toString(); // Ensure consistent key type
      if (!acc[storeId]) {
        acc[storeId] = [];
      }
      acc[storeId].push(item);
      return acc;
    }, {} as Record<string, CartItemDto[]>);
  }

  // The main method to create an order
  async createOrder(createOrderDto: CreateOrderDto, buyerUserId: string): Promise<Order> {

    // --- Log Entry Point ---
    this.logger.log(`--- Service: createOrder method entered for user: ${buyerUserId} ---`);

    const {
      cartItems,
      deliverySelections,
      selectedArea,
      selectedPickupPoint,
      yocoChargeId, // Use if you add the column later
      frontendGrandTotal,
    } = createOrderDto;

    const groupedItems = this.groupItemsByStore(cartItems);
    const storeIds = Object.keys(groupedItems);
    const productIds = cartItems.map(item => item.productId);

    // --- Log Before Query Runner ---
    this.logger.log(`Service: Attempting to get query runner for user: ${buyerUserId}`);
    const queryRunner = this.dataSource.createQueryRunner();
    this.logger.log(`Service: Query runner obtained. Connecting and starting transaction for user: ${buyerUserId}`);

    let savedOrder: Order | null = null; // Variable to hold the saved order outside try block if needed

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      this.logger.log(`Service: Transaction started for user: ${buyerUserId}`);

      // --- Log Before Fetches ---
      this.logger.log(`Service: Inside TRY block. Fetching products and stores for user: ${buyerUserId}`);

      // --- 1. Fetch required data within transaction ---
      // Use queryRunner.manager for all operations inside the transaction
      const products = await queryRunner.manager.findByIds(Product, productIds);
      // Use 'prodId' which is the property name in Product entity
      const productMap = new Map(products.map(p => [p.prodId, p]));

      // Use 'storeId' which is the property name in Store entity
      const storeEntities = await queryRunner.manager.findByIds(Store, storeIds);
      const storeMap = new Map(storeEntities.map(s => [s.storeId.toString(), s]));


      // --- 2. Validate data & Calculate totals ---
      let calculatedGrandTotal = 0;
      const sellerOrdersToCreate: Partial<SellerOrder>[] = []; // Temp storage

      for (const storeId of storeIds) {
        const currentStoreItems = groupedItems[storeId];
        const storeInfo = storeMap.get(storeId); // Get Store entity from Map
        const deliveryMethod = deliverySelections[storeId]; // Get selected delivery method

        // --- Validation Checks ---
        if (!storeInfo) {
          // Log specific ID not found
          this.logger.error(`Store details not found for store ID: ${storeId} during order creation for user ${buyerUserId}.`);
          throw new NotFoundException(`Store details not found for store ID: ${storeId}`);
        }
        if (!deliveryMethod || (deliveryMethod !== 'standard' && deliveryMethod !== 'express')) {
          this.logger.error(`Invalid delivery method ('${deliveryMethod}') for store ID: ${storeId} during order creation for user ${buyerUserId}.`);
          throw new BadRequestException(`Invalid or missing delivery method ('${deliveryMethod}') for store ID: ${storeId}. Must be 'standard' or 'express'.`);
        }
        this.logger.debug(`Processing store ${storeId} (${storeInfo.storeName}) with ${deliveryMethod} delivery.`);

        let itemsSubtotal = 0;
        for (const item of currentStoreItems) {
          const productInfo = productMap.get(item.productId); // Get Product entity from Map

          if (!productInfo) {
            this.logger.error(`Product details not found for product ID: ${item.productId} during order creation for user ${buyerUserId}.`);
            throw new NotFoundException(`Product details not found for product ID: ${item.productId}`);
          }

          // --- Stock Check ---
          // Use 'productquantity' property from Product entity
          if (productInfo.productquantity < item.quantity) {
            this.logger.warn(`Insufficient stock for product ${item.productId} (${productInfo.name}). Required: ${item.quantity}, Available: ${productInfo.productquantity}`);
            throw new ConflictException(`Insufficient stock for product: ${productInfo.name} (ID: ${item.productId}). Only ${productInfo.productquantity} available.`);
          }

          // Use the price snapshot from the DTO for calculation
          itemsSubtotal += item.pricePerUnitSnapshot * item.quantity;
        } // End loop through items for one store

        // --- Calculate delivery & seller total ---
        // Use correct property names from Store entity: standardPrice, expressPrice, standardTime, expressTime
        const deliveryPrice = deliveryMethod === 'standard' ? storeInfo.standardPrice : storeInfo.expressPrice;
        const deliveryTime = deliveryMethod === 'standard' ? storeInfo.standardTime : storeInfo.expressTime;
        const sellerTotal = itemsSubtotal + deliveryPrice;

        calculatedGrandTotal += sellerTotal; // Add seller's total to grand total

        // --- Store data for SellerOrder creation ---
        // Use correct property 'userId' from Store entity for seller's ID
        sellerOrdersToCreate.push({
          userID: storeInfo.userId,
          delivery_method: deliveryMethod,
          delivery_price: deliveryPrice,
          delivery_time_estimate: deliveryTime,
          items_subtotal: itemsSubtotal,
          seller_total: sellerTotal,
          status: 'Processing', // Initial status
        });

      } // End loop through stores

      // --- Optional: Grand Total Verification ---
      if (Math.abs(calculatedGrandTotal - frontendGrandTotal) > 0.01) {
        this.logger.warn(`Grand total mismatch! Backend calculated: ${calculatedGrandTotal.toFixed(2)}, Frontend sent: ${frontendGrandTotal.toFixed(2)} for user ${buyerUserId}. Proceeding with backend total.`);
      }


      // --- 3. Create the main Order record ---
      this.logger.debug(`Creating main order record for user ${buyerUserId}`);
      const newOrder = queryRunner.manager.create(Order, {
        userID: buyerUserId, // The buyer's ID
        order_date: new Date(),
        grand_total: calculatedGrandTotal, // Use the backend calculated total
        pickup_area: selectedArea,
        pickup_point: selectedPickupPoint,
        // yocoChargeId: yocoChargeId, // Uncomment if you add the column
      });
      // Assign to outer variable AFTER saving successfully
      savedOrder = await queryRunner.manager.save(Order, newOrder); // Save using queryRunner.manager
      const orderId = savedOrder.order_id;
      this.logger.log(`Created Order ID: ${orderId} for user ${buyerUserId}`);


      // --- 4. Create SellerOrder records and SellerOrderItem records ---
      let sellerIndex = 0;
      for (const storeId of storeIds) {
        const currentStoreItems = groupedItems[storeId];
        const sellerOrderData = sellerOrdersToCreate[sellerIndex++];
        const storeInfo = storeMap.get(storeId)!; // We know it exists from earlier check

        this.logger.debug(`Creating SellerOrder for store ${storeId} (Seller: ${storeInfo.userId}) linked to Order ${orderId}`);
        const newSellerOrder = queryRunner.manager.create(SellerOrder, {
          ...sellerOrderData, // Spread the calculated data
          order_id: orderId, // Link to the main order
        });
        const savedSellerOrder = await queryRunner.manager.save(SellerOrder, newSellerOrder); // Save using queryRunner.manager
        const sellerOrderId = savedSellerOrder.seller_order_id;


        const sellerOrderItemsToCreate: Partial<SellerOrderItem>[] = [];
        // --- 5. Prepare Items and Update Stock ---
        for (const item of currentStoreItems) {
          const productInfo = productMap.get(item.productId)!; // We know it exists

           this.logger.debug(`Preparing item ${item.productId} (Qty: ${item.quantity}) for SellerOrder ${sellerOrderId}`);
          // Prepare item record
          sellerOrderItemsToCreate.push({
            seller_order_id: sellerOrderId,
            productID: item.productId,
            quantity_ordered: item.quantity,
            price_per_unit: item.pricePerUnitSnapshot,
             // Use correct property 'name' from Product entity
            product_name_snapshot: productInfo.name,
          });

          // --- 6. !! Update Product Stock !! ---
           // Use 'productquantity' property from Product entity
          const newQuantity = productInfo.productquantity - item.quantity;
           this.logger.debug(`Updating stock for product ${item.productId} from ${productInfo.productquantity} to ${newQuantity}`);
          // Use primary key property 'prodId' for update condition
          await queryRunner.manager.update(Product, item.productId, {
            productquantity: newQuantity,
          });
          // Update the map in memory
          productInfo.productquantity = newQuantity;

        } // End item loop for one seller

        // Save all items for the current seller order
        await queryRunner.manager.save(SellerOrderItem, sellerOrderItemsToCreate); // Use queryRunner.manager
        this.logger.log(`Saved ${sellerOrderItemsToCreate.length} items for SellerOrder ID: ${sellerOrderId}`);

      } // End seller loop


      // --- 7. Clear Buyer's Cart on Backend ---
      this.logger.debug(`Clearing cart items for user ${buyerUserId}`);
      const deleteResult = await queryRunner.manager.delete(CartItem, { userID: buyerUserId }); // Use queryRunner.manager and correct User ID column
      this.logger.log(`Deleted ${deleteResult.affected || 0} cart items for user ${buyerUserId}`);


      // --- 8. Commit Transaction ---
      this.logger.log(`Service: Attempting to commit transaction for user: ${buyerUserId}`); // Log Before Commit
      await queryRunner.commitTransaction();
      this.logger.log(`Service: Transaction committed successfully for user: ${buyerUserId}`); // Log After Commit

      // --- Step 9 (Fetching final order) is now outside the try block ---

    } catch (error) {
      // --- Log Inside Catch Block ---
      this.logger.error(`--- Service: CATCH block reached for user ${buyerUserId}. Rolling back transaction. Error: ${error.message} ---`, error.stack);
      // Rollback MUST happen inside the catch block if commit fails or any error occurs before commit
      if (queryRunner.isTransactionActive) { // Check if transaction is still active before rollback attempt
          this.logger.log(`Service: Attempting rollback for user ${buyerUserId}.`);
          await queryRunner.rollbackTransaction();
          this.logger.log(`Service: Transaction rolled back for user ${buyerUserId}.`);
      } else {
          this.logger.log(`Service: Transaction was not active when error caught for user ${buyerUserId}. Rollback skipped.`);
      }
      // Re-throw error
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ConflictException) {
        throw error; // Let NestJS handle standard HTTP exceptions
      }
      // Throw generic error for unexpected issues
      throw new InternalServerErrorException('Failed to create order due to an unexpected internal error.');

    } finally {
      // --- Release the Query Runner ---
      this.logger.log(`--- Service: FINALLY block reached for user ${buyerUserId}. Releasing query runner. ---`);
      // Ensure release happens even if connect() or startTransaction() failed
      if (queryRunner.isReleased === false){
          await queryRunner.release();
      } else {
           this.logger.log(`Service: Query runner already released for user ${buyerUserId}.`)
      }

    }

    // --- 9. Return the created Order (if commit was successful) ---
    // This code runs only if the try block completed without error and commit succeeded
    if (savedOrder) {
       this.logger.log(`Service: Attempting final fetch for Order ID: ${savedOrder.order_id}`); // Log Before Final Fetch
       try {
            // Use the injected repository to fetch the final state with relations
            const finalOrder = await this.ordersRepository.findOneOrFail({
                where: { order_id: savedOrder.order_id },
                // Specify relations needed by the frontend response
                relations: [
                    'user', // Include buyer details?
                    'sellerOrders',
                    'sellerOrders.seller', // Include seller details?
                    'sellerOrders.items',
                    'sellerOrders.items.product' // Include basic product details?
                ],
            });
             this.logger.log(`Service: Successfully fetched final order details for Order ID: ${savedOrder.order_id}`);
            return finalOrder;
       } catch (fetchError) {
           // Handle error fetching the final order details (though order was created)
           this.logger.error(`Service: FAILED to fetch final order details after commit for Order ID: ${savedOrder.order_id}. Error: ${fetchError.message}`, fetchError.stack);
           // Throw an error, as the controller expects the Order object
           throw new InternalServerErrorException('Order was created successfully, but failed to retrieve the final details.');
       }

    } else {
      // This case should technically not be reachable if the code logic is correct,
      // because an error during the try block would prevent reaching here.
      // But include for defensiveness.
      this.logger.error(`Service: Order processing finished but savedOrder object is unexpectedly null for user ${buyerUserId}.`);
      throw new InternalServerErrorException('Order processing completed, but failed to retrieve order reference.');
    }

  } // End createOrder method
} // End OrdersService class