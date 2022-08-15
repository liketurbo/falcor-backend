import { ApiProperty } from '@nestjs/swagger';
import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

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

  @Column({ default: 0 })
  @ApiProperty()
  balance: number;

  @CreateDateColumn()
  createdAt: Date;
}
