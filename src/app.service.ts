import { Injectable } from '@nestjs/common';
import { EthersSigner, InjectSignerProvider } from 'nestjs-ethers';

@Injectable()
export class AppService {
  constructor(
    @InjectSignerProvider()
    private readonly ethersSigner: EthersSigner,
  ) {}

  async createWallet() {
    const wallet = this.ethersSigner.createRandomWallet();
    const address = await wallet.getAddress();
    return {
      address,
      mnemonic: wallet.mnemonic.phrase,
    };
  }
}
