import { ApiProperty } from '@nestjs/swagger';

export interface RandomWallet {
  address: string;
  pubkey: string;
  mnemonic: string;
}
