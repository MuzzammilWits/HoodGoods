import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('Products') // Match your exact table name
export class Product {
  @PrimaryColumn({ name: 'productID', type: 'int' })
  prodId: number;
  
  @Column({ name: 'productName', type: 'varchar' })
  name: string;

  @Column({ name: 'productdescription', type: 'text' })
  description: string;

  @Column({ name: 'productcategory', type: 'varchar' })
  category: string;

  @Column({ name: 'productprice', type: 'float' })
  price: number;

  // Add the new quantity field
  @Column({ name: 'productquantity', type: 'int' }) // Assuming the DB column is 'productquantity' and type is integer
  productquantity: number;

  @Column({ name: 'userID', type: 'varchar' })
  userId: string;

  @Column({ name: 'imageURL', type: 'varchar' })
  imageUrl: string;

  @Column({ name: 'storeName', type: 'varchar' })
  storeName: string;

  @Column({ name: 'is_active', type: 'boolean' })
  isActive: boolean;
}