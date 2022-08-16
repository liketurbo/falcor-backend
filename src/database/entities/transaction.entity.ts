import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'transactions' })
export class Transaction {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @Column()
  @ApiProperty()
  from: string;

  @Column()
  @ApiProperty()
  to: string;

  @Column({ type: 'float' })
  @ApiProperty()
  amount: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  @ApiProperty()
  createdAt: Date;
}
