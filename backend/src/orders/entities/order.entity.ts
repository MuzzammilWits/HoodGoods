// src/orders/entities/order.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../auth/user.entity'; // Corrected path relative to src/orders/entities/
import { SellerOrder } from './seller-order.entity'; // Relation to SellerOrder entity (will create next)

@Entity('Orders') // Using table name from your schema diagram
export class Order {
  @PrimaryGeneratedColumn() // Assuming you want an auto-incrementing number PK for orders
  order_id: number;

  // Foreign Key to Users table
  @Column({ type: 'varchar' }) // Matches User.userID type (varchar)
  userID: string; // Stores the Auth0 'sub' string (e.g., 'auth0|xxxxxx')

  // Define the relationship to the User entity
  @ManyToOne(() => User) // No need for inverse relation in User entity unless desired
  @JoinColumn({ name: 'userID' }) // Specifies the FK column in this table
  user: User; // Property to access the related User object

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  order_date: Date;

  @Column('decimal', { precision: 10, scale: 2, comment: 'Final total charged to buyer' })
  grand_total: number;

  @Column({ length: 255, nullable: true, comment: 'Pickup location area chosen by buyer' })
  pickup_area: string;

  @Column({ length: 255, nullable: true, comment: 'Specific pickup point chosen by buyer' })
  pickup_point: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relationship: An Order can have multiple SellerOrders
  // 'sellerOrders' is the property name on this (Order) side
  // 'order' is the property name on the other (SellerOrder) side that links back here
  @OneToMany(() => SellerOrder, sellerOrder => sellerOrder.order)
  sellerOrders: SellerOrder[];

  // Optional but Recommended: Add Yoco Payment Ref if needed later
  // @Column({ name: 'yoco_charge_id', length: 255, nullable: true, unique: true, comment: 'Yoco charge ID for reconciliation' })
  // yocoChargeId: string;
}