// src/auth/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  auth0Id: string; // ID from Auth0 (example: auth0|12345)

  @Column('text')
  accessToken: string;

  @Column({ nullable: true })
  email?: string; // Optional: save email too

  @Column({ nullable: true })
  name?: string; // Optional: save name too
}
