import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EthersSigner, InjectSignerProvider } from 'nestjs-ethers';
import { Repository } from 'typeorm';

import { WALLET_REPOSITORY } from '../database/constants/db-ids.constants';
import { Wallet } from '../database/entities/wallet.entity';

interface NewWallet {
  pubkey: string;
  keystore: string;
  mnemonic: string;
}

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectSignerProvider()
    private readonly ethersSigner: EthersSigner,
    @Inject(WALLET_REPOSITORY)
    private readonly walletsRepository: Repository<Wallet>,
  ) {}

  async createDraft(password: string): Promise<NewWallet> {
    const walletData = this.ethersSigner.createRandomWallet();
    return {
      pubkey: walletData.publicKey,
      keystore: await walletData.encrypt(password),
      mnemonic: walletData.mnemonic.phrase,
    };
  }

  async savePersonal({ pubkey, keystore }: NewWallet): Promise<void> {
    const newWallet = this.walletsRepository.create({
      pubkey,
      keystore,
    });
    await this.walletsRepository.save(newWallet);
  }

  async import(mnemonic: string): Promise<Wallet> {
    const walletData = this.ethersSigner.createWalletfromMnemonic(mnemonic);
    const foundWallet = await this.walletsRepository.findOneBy({
      pubkey: walletData.publicKey,
    });
    if (!foundWallet) throw new NotFoundException('Wallet not found');
    return {
      ...foundWallet,
      mnemonic,
    };
  }

  async restore(pubkey: string, password: string): Promise<Wallet> {
    const foundWallet = await this.walletsRepository.findOneBy({
      pubkey,
    });
    if (!foundWallet) throw new NotFoundException('Wallet not found');

    try {
      await this.ethersSigner.createWalletFromEncryptedJson(
        foundWallet.keystore,
        password,
      );

      return foundWallet;
    } catch (e) {
      if (e.message === 'invalid password')
        throw new ForbiddenException('Invalid password');

      this.logger.error(e, { pubkey, password });
      throw new InternalServerErrorException('Failed to restore wallet');
    }
  }

  async changePassword(mnemonic: string, newPassword: string) {
    const restoredWallet = this.ethersSigner.createWalletfromMnemonic(mnemonic);
    const foundWallet = await this.walletsRepository.findOneBy({
      pubkey: restoredWallet.publicKey,
    });
    if (!foundWallet) throw new NotFoundException('Wallet not found');

    const newKeystore = await restoredWallet.encrypt(newPassword);
    await this.walletsRepository.update(
      {
        pubkey: restoredWallet.publicKey,
      },
      {
        keystore: newKeystore,
      },
    );
  }

  getByPubkey(pubkey: string): Promise<Wallet | null> {
    return this.walletsRepository.findOneBy({
      pubkey,
    });
  }

  async increaseBalance(pubkey: string, amount: number): Promise<void> {
    await this.walletsRepository.increment(
      {
        pubkey,
      },
      'balance',
      amount,
    );
  }
}
