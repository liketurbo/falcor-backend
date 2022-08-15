import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Wallet {
  @PrimaryColumn()
  address: number;

  @Column()
  pubkey: string;

  @Column()
  mnemonic: string;

  @CreateDateColumn()
  createdAt: Date;
}
