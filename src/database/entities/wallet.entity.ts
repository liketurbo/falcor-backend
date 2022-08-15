import { ApiProperty } from '@nestjs/swagger';
import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';
import {
  PERSONAL_WALLET,
  SERVICE_WALLET,
} from '../../constants/wallet-types.constants';
import { WalletType } from '../../types';

@Entity()
export class Wallet {
  @PrimaryColumn()
  @ApiProperty()
  address: string;

  @Column()
  @ApiProperty()
  pubkey: string;

  @Column()
  @ApiProperty()
  mnemonic: string;

  @Column({ type: 'float', default: 0 })
  @ApiProperty()
  balance: number;

  @Column({
    nullable: true,
    unique: true,
  })
  id?: string;

  @Column({
    type: 'enum',
    enum: [SERVICE_WALLET, PERSONAL_WALLET],
    default: PERSONAL_WALLET,
  })
  type: WalletType;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
}
