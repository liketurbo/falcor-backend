import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import {
  PERSONAL_WALLET,
  SERVICE_WALLET,
} from '../../wallets/constants/wallet-types.constants';
import { WalletType } from '../../types';
import { Stake } from './stake.entity';

@Entity({ name: 'wallets' })
export class Wallet {
  @PrimaryColumn()
  @ApiProperty()
  pubkey: string;

  @Column({
    nullable: true,
  })
  keystore?: string;

  @Column({
    nullable: true,
  })
  mnemonic?: string;

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

  @OneToMany(() => Stake, (stake) => stake.owner)
  stakes: Stake[];

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
}
