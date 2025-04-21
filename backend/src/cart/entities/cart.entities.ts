import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('cart_item')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'userid', type: 'varchar' })
  userId: string;

  @Column({ name: 'productid', type: 'varchar' })
  productId: string;

  @Column('varchar')
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column('int')
  quantity: number;

  @Column({ type: 'varchar', nullable: true })
  image: string | null;

  @Column({ 
    name: 'createdat',
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP' 
  })
  createdAt: Date;

  @Column({ 
    name: 'updatedat',
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date;
}