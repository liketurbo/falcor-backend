import { Injectable } from '@nestjs/common';
import { EthersSigner, InjectSignerProvider } from 'nestjs-ethers';
import { RandomWallet as NewWallet } from './types';

@Injectable()
export class AppService {
  constructor(
    @InjectSignerProvider()
    private readonly ethersSigner: EthersSigner,
  ) {}

  async createNewWallet(password: string): Promise<NewWallet> {
    const wallet = this.ethersSigner.createRandomWallet();
    const address = await wallet.getAddress();
    const keystore = await wallet.encrypt(password);
    return {
      address,
      pubkey: wallet.publicKey,
      mnemonic: wallet.mnemonic.phrase,
      keystore,
    };
  }

  async getWallet(keystore: string, password: string): Promise<NewWallet> {
    const wallet = await this.ethersSigner.createWalletFromEncryptedJson(
      keystore,
      password,
    );
    const address = await wallet.getAddress();
    return {
      address,
      pubkey: wallet.publicKey,
      mnemonic: wallet.mnemonic.phrase,
      keystore,
    };
  }

  async restoreWallet(mnemonic: string): Promise<NewWallet> {
    const wallet = this.ethersSigner.createWalletfromMnemonic(mnemonic);
    const address = await wallet.getAddress();
    const keystore = await wallet.encrypt(password);
  }

  encryptWallet(wallet: ) {

  }
}
