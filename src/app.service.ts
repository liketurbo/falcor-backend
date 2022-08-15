import { Injectable } from '@nestjs/common';
import { EthersSigner, InjectSignerProvider } from 'nestjs-ethers';
import { Repository } from 'typeorm';
import { RandomWallet } from './types';
import { Wallet as WalletEntity } from './entities/wallet.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AppService {
  constructor(
    @InjectSignerProvider()
    private readonly ethersSigner: EthersSigner,
    @InjectRepository(WalletEntity)
    private readonly walletsRepository: Repository<WalletEntity>,
  ) {}

  async createRandomWallet(): Promise<RandomWallet> {
    const wallet = this.ethersSigner.createRandomWallet();
    const address = await wallet.getAddress();
    return {
      address,
      pubkey: wallet.publicKey,
      mnemonic: wallet.mnemonic.phrase,
    };
  }

  async saveWallet(wallet: RandomWallet) {
    return this.walletsRepository.insert(wallet);
  }
}
