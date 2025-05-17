import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { AdminActionType } from '../admin.types';

@Entity()
export class AdminAction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: AdminActionType })
  actionType: AdminActionType;

  @Column()
  targetId: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column()
  adminId: string;

  @CreateDateColumn()
  createdAt: Date;
}