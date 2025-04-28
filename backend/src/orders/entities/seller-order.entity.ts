// src/orders/entities/seller-order.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Order } from './order.entity'; // Relation to Order entity
import { User } from '../../auth/user.entity'; // Relation to User entity (for the Seller)
import { SellerOrderItem } from './seller-order-item.entity'; // Relation to SellerOrderItem entity (will create next)
// Optional: Import Store if you decide to link SellerOrder directly to Store
// import { Store } from '../../store/entities/store.entity';

@Entity('SellerOrders') // Using table name from your schema diagram
export class SellerOrder {
  @PrimaryGeneratedColumn()
  seller_order_id: number;

  // Foreign Key to Orders table
  @Column() // TypeORM infers type from relation, or set explicitly: { type: 'int' }
  order_id: number; // Matches Order.order_id type

  // Define relationship back to the main Order
  // 'order' is the property name on this side
  // 'sellerOrders' is the property name on the Order side
  @ManyToOne(() => Order, order => order.sellerOrders)
  @JoinColumn({ name: 'order_id' }) // Specifies the FK column in this table
  order: Order;

  // Foreign Key to Users table (for the Seller)
  @Column({ type: 'varchar' }) // Matches User.userID type (varchar)
  userID: string; // Stores the Seller's Auth0 'sub' string

  // Define relationship to the Seller's User record
  @ManyToOne(() => User) // No need for inverse relation in User entity unless desired
  @JoinColumn({ name: 'userID' }) // Specifies the FK column in this table
  seller: User; // Property to access the related Seller User object

  // --- Delivery Details Snapshotted from Store/Checkout State ---
  @Column({ length: 100, comment: 'Chosen delivery method (e.g., standard, express)' })
  delivery_method: string;

  @Column('decimal', { precision: 10, scale: 2, comment: 'Delivery price charged for this seller' })
  delivery_price: number;

  @Column({ length: 255, nullable: true, comment: 'Estimated delivery time snapshot' })
  delivery_time_estimate: string;
  // --- End Delivery Details ---

  // --- Financials for this Seller's portion of the Order ---
  @Column('decimal', { precision: 10, scale: 2, comment: 'Subtotal of items from this seller' })
  items_subtotal: number;

  @Column('decimal', { precision: 10, scale: 2, comment: 'Total charged for this seller (items_subtotal + delivery_price)' })
  seller_total: number;
  // --- End Financials ---

  @Column({ length: 50, default: 'Processing', comment: 'Status of this part of the order (e.g., Processing, Shipped, Delivered)' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relationship: A SellerOrder has multiple SellerOrderItems
  // 'items' is the property name on this (SellerOrder) side
  // 'sellerOrder' is the property name on the SellerOrderItem side linking back
  @OneToMany(() => SellerOrderItem, item => item.sellerOrder)
  items: SellerOrderItem[];

  // --- Optional: Direct Link to Store ---
  // If you find you often need the Store info when you have a SellerOrder,
  // you could add a direct foreign key here. The Seller's userID already
  // links to the User who owns the Store, but a direct link can sometimes
  // simplify queries if needed. Assess based on your query patterns.
  // @Column({ type: 'bigint' }) // Matches Product.storeId type? Check Store PK type
  // store_id: string; // Or number
  // @ManyToOne(() => Store)
  // @JoinColumn({ name: 'store_id', referencedColumnName: 'storeId' /* <<< CHECK Store PK property name */ })
  // store: Store;
  // --- End Optional Link ---
}