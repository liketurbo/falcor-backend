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

  @Column({ type: 'float', name: 'hold_amount' })
  @ApiProperty()
  holdAmount: number;

  @Column({ type: 'float', name: 'profit_amount', default: 0 })
  @ApiProperty()
  profitAmount: number;

  @Column({ type: 'interval' })
  @ApiProperty({ type: String })
  period: IPostgresInterval;

  @ManyToOne(() => Wallet, (wallet) => wallet)
  @JoinColumn({ name: 'wallet_pubkey' })
  wallet: Wallet;

  @ManyToOne(() => Wallet, (wallet) => wallet.stakes)
  @JoinColumn({ name: 'owner_pubkey' })
  owner: Wallet;

  @Column({ default: true })
  @ApiProperty()
  frozen: boolean;

  @CreateDateColumn({
    name: 'created_at',
  })
  @ApiProperty()
  createdAt: Date;
}
