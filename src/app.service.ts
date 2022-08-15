import { Injectable } from '@nestjs/common';
import { EthersSigner, InjectSignerProvider } from 'nestjs-ethers';
import { RandomWallet } from './types';

@Injectable()
export class AppService {
  constructor(
    @InjectSignerProvider()
    private readonly ethersSigner: EthersSigner,
  ) {}

  async createWallet(): Promise<RandomWallet> {
    const wallet = this.ethersSigner.createRandomWallet();
    const address = await wallet.getAddress();
    return {
      address,
      pubkey: wallet.publicKey,
      mnemonic: wallet.mnemonic.phrase,
    };
  }
}
