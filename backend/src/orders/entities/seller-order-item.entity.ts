// src/orders/entities/seller-order-item.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SellerOrder } from './seller-order.entity'; // Relation to SellerOrder entity
import { Product } from '../../products/entities/product.entity'; // Relation to Product entity

@Entity('SellerOrderItems') // Using table name from your schema diagram
export class SellerOrderItem {
  @PrimaryGeneratedColumn()
  seller_order_item_id: number;

  // Foreign Key to SellerOrders table
  @Column() // TypeORM infers type, or use { type: 'int' }
  seller_order_id: number; // Matches SellerOrder.seller_order_id type

  // Define relationship back to the parent SellerOrder
  // 'sellerOrder' is the property name on this side
  // 'items' is the property name on the SellerOrder side
  @ManyToOne(() => SellerOrder, sellerOrder => sellerOrder.items)
  @JoinColumn({ name: 'seller_order_id' }) // Specifies the FK column in this table
  sellerOrder: SellerOrder;

  // Foreign Key to Products table
  @Column() // TypeORM infers type, or use { type: 'int' } to match Product.prodId
  productID: number; // Matches Product.prodId type

  // Define relationship to the Product ordered
  @ManyToOne(() => Product) // No need for inverse relation in Product unless desired
  @JoinColumn({ name: 'productID', referencedColumnName: 'prodId' }) // FK col in this table, PK property name in Product entity
  product: Product; // Property to access the related Product object

  @Column({ type: 'int', comment: 'Quantity of this product ordered from this seller' })
  quantity_ordered: number;

  // Price snapshot at time of purchase
  @Column('decimal', { precision: 10, scale: 2, comment: 'Price per unit at the time of purchase' })
  price_per_unit: number;

  // Product name snapshot at time of purchase (optional but good practice)
  @Column({ length: 255, nullable: true, comment: 'Product name at the time of purchase' })
  product_name_snapshot: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}