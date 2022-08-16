import { ApiProperty } from '@nestjs/swagger';
import { IPostgresInterval } from 'postgres-interval';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Wallet } from './wallet.entity';

@Entity({ name: 'stakes' })
export class Stake {
  @PrimaryGeneratedColumn()
  @ApiProperty()
  id: number;

  @Column({ type: 'float' })
  @ApiProperty()
  amount: number;

  @Column({ type: 'interval' })
  @ApiProperty()
  period: IPostgresInterval;

  @ManyToOne(() => Wallet, (wallet) => wallet.stakes)
  @JoinColumn({ name: 'owner_pubkey' })
  owner: Wallet;

  @CreateDateColumn({
    name: 'created_at',
  })
  @ApiProperty()
  createdAt: Date;
}
