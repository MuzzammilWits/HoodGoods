import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../../products/entities/product.entity'; 
import { User } from '../../auth/user.entity'; 
@Entity('cart_item')
export class CartItem {
  @PrimaryGeneratedColumn() 
  cartID: number; 

  @Column({ name: 'userID', type: 'varchar' }) 
  userId: string;

  @Column({ name: 'productID', type: 'int4' }) 
  productId: number; 

  @Column({ type: 'int4' }) 
  quantity: number;


}