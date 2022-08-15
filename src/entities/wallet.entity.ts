import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Wallet {
  @PrimaryColumn()
  address: string;

  @Column()
  pubkey: string;

  @Column()
  mnemonic: string;

  @Column({ default: 0 })
  balance: number;

  @CreateDateColumn()
  createdAt: Date;
}
