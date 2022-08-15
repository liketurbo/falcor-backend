import { Inject, Injectable } from '@nestjs/common';
import { EthersSigner, InjectSignerProvider } from 'nestjs-ethers';
import { Repository } from 'typeorm';
import { RandomWallet } from './types';
import { Wallet as WalletEntity } from './database/entities/wallet.entity';
import { WALLET_REPOSITORY } from './database/constants/db-ids.constants';

@Injectable()
export class AppService {
  constructor(
    @InjectSignerProvider()
    private readonly ethersSigner: EthersSigner,
    @Inject(WALLET_REPOSITORY)
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
    const createdWallet = this.walletsRepository.create(wallet);
    await this.walletsRepository.save(createdWallet);
    return createdWallet;
  }
}
