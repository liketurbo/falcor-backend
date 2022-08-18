import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EthersModule } from 'nestjs-ethers';
import { DataSource, Repository } from 'typeorm';

import {
  DATA_SOURCE,
  WALLET_REPOSITORY,
} from '../database/constants/db-ids.constants';
import { DatabaseModule } from '../database/database.module';
import { WalletProvider } from '../database/database.providers';
import { Wallet } from '../database/entities/wallet.entity';
import { WalletsService } from './wallets.service';

describe('WalletsService', () => {
  let dbConnection: DataSource;
  let walletsService: WalletsService;
  let walletRepository: Repository<Wallet>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, EthersModule.forRoot()],
      providers: [WalletProvider, WalletsService],
    }).compile();

    dbConnection = module.get<DataSource>(DATA_SOURCE);
    walletsService = module.get<WalletsService>(WalletsService);
    walletRepository = module.get<Repository<Wallet>>(WALLET_REPOSITORY);
  });

  afterAll(async () => {
    await dbConnection.destroy();
  });

  it('should be defined', () => {
    expect(dbConnection).toBeDefined();
    expect(walletsService).toBeDefined();
    expect(walletRepository).toBeDefined();
  });

  it('creates wallet', async () => {
    const wallet = await walletsService.createDraft('0000');
    await walletsService.save({
      pubkey: wallet.pubkey,
      keystore: wallet.keystore,
    });
    const foundWallet = await walletRepository.findOneBy({
      pubkey: wallet.pubkey,
    });
    expect({
      pubkey: wallet.pubkey,
      keystore: wallet.keystore,
      mnemonic: null,
    }).toEqual({
      pubkey: foundWallet.pubkey,
      keystore: foundWallet.keystore,
      mnemonic: foundWallet.mnemonic,
    });
  });

  it('imports wallet', async () => {
    const wallet = await walletsService.createDraft('0000');
    await walletsService.save({
      pubkey: wallet.pubkey,
      keystore: wallet.keystore,
    });
    const importedWallet = await walletsService.import(wallet.mnemonic);
    expect({
      pubkey: wallet.pubkey,
      keystore: wallet.keystore,
    }).toEqual({
      pubkey: importedWallet.pubkey,
      keystore: importedWallet.keystore,
    });
  });

  it('restores wallet', async () => {
    const wallet = await walletsService.createDraft('0000');
    await walletsService.save({
      pubkey: wallet.pubkey,
      keystore: wallet.keystore,
    });
    const restoredWallet = await walletsService.restore(wallet.pubkey, '0000');
    expect({
      pubkey: wallet.pubkey,
      keystore: wallet.keystore,
    }).toEqual({
      pubkey: restoredWallet.pubkey,
      keystore: restoredWallet.keystore,
    });

    await expect(walletsService.restore(wallet.pubkey, '0001')).rejects.toEqual(
      new ForbiddenException('Invalid password'),
    );
  });

  it('changes password', async () => {
    const wallet = await walletsService.createDraft('0000');
    await walletsService.save({
      pubkey: wallet.pubkey,
      keystore: wallet.keystore,
    });
    await walletsService.changePassword(wallet.mnemonic, '0001');
    const foundWallet = await walletRepository.findOneBy({
      pubkey: wallet.pubkey,
    });
    expect(wallet.pubkey).toBe(foundWallet.pubkey);
    expect(wallet.keystore).not.toBe(foundWallet.keystore);
  });

  it('finds wallet by pubkey', async () => {
    const wallet = await walletsService.createDraft('0000');
    await walletsService.save({
      pubkey: wallet.pubkey,
      keystore: wallet.keystore,
    });
    const foundWallet = await walletsService.getByPubkey(wallet.pubkey);
    expect(foundWallet).toBeDefined();
  });

  it('updates balance', async () => {
    const wallet = await walletsService.createDraft('0000');
    await walletsService.save({
      pubkey: wallet.pubkey,
      keystore: wallet.keystore,
    });
    const foundWallet1 = await walletsService.getByPubkey(wallet.pubkey);
    expect(foundWallet1.balance).toBe(0);
    await walletsService.incrementBalance(foundWallet1.pubkey, 666);
    const foundWallet2 = await walletsService.getByPubkey(wallet.pubkey);
    expect(foundWallet2.balance).toBe(666);
  });
});
