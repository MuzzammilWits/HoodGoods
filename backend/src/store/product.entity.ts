// src/store/product.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../auth/user.entity';

@Entity('Products')
export class Product {
  @PrimaryGeneratedColumn({ name: 'productID' })
  productID: number;

  @Column({ name: 'productName' })
  productName: string;

  @Column({ name: 'productdescription', type: 'text' })
  productDescription: string;

  @Column({ name: 'productcategory' })
  productCategory: string;

  @Column({ name: 'productprice', type: 'float4' })
  productPrice: number;

  @Column({ name: 'userID' })
  userID: string;

  // --- ADD THIS BACK ---
  @Column({ name: 'imageURL', type: 'varchar', length: 2048, nullable: true }) // Allow longer URLs, make nullable
  imageURL: string | null; // Use string | null type
  // --- END ADD ---

  @Column({ name: 'storeName' })
  storeName: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userID' })
  user: User;
}