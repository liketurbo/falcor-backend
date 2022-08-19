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
    const draftWallet = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet);
    const foundWallet = await walletRepository.findOneBy({
      pubkey: draftWallet.pubkey,
    });
    expect({
      pubkey: draftWallet.pubkey,
      keystore: draftWallet.keystore,
      mnemonic: null,
    }).toEqual({
      pubkey: foundWallet.pubkey,
      keystore: foundWallet.keystore,
      mnemonic: foundWallet.mnemonic,
    });
  });

  it('imports wallet', async () => {
    const draftWallet = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet);
    const importedWallet = await walletsService.import(draftWallet.mnemonic);
    expect({
      pubkey: draftWallet.pubkey,
      keystore: draftWallet.keystore,
    }).toEqual({
      pubkey: importedWallet.pubkey,
      keystore: importedWallet.keystore,
    });
  });

  it('restores wallet', async () => {
    const draftWallet = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet);
    const restoredWallet = await walletsService.restore(
      draftWallet.pubkey,
      '0000',
    );
    expect({
      pubkey: draftWallet.pubkey,
      keystore: draftWallet.keystore,
    }).toEqual({
      pubkey: restoredWallet.pubkey,
      keystore: restoredWallet.keystore,
    });

    await expect(
      walletsService.restore(draftWallet.pubkey, '0001'),
    ).rejects.toEqual(new ForbiddenException('Invalid password'));
  });

  it('changes password', async () => {
    const draftWallet = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet);
    await walletsService.changePassword(draftWallet.mnemonic, '0001');
    const foundWallet = await walletRepository.findOneBy({
      pubkey: draftWallet.pubkey,
    });
    expect(draftWallet.pubkey).toBe(foundWallet.pubkey);
    expect(draftWallet.keystore).not.toBe(foundWallet.keystore);
  });

  it('finds wallet by pubkey', async () => {
    const draftWallet = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet);
    const foundWallet = await walletsService.getByPubkey(draftWallet.pubkey);
    expect(foundWallet).toBeDefined();
  });

  it('updates balance', async () => {
    const draftWallet = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet);
    const foundWallet1 = await walletsService.getByPubkey(draftWallet.pubkey);
    expect(foundWallet1.balance).toBe(0);
    await walletsService.increaseBalance(foundWallet1.pubkey, 666);
    const foundWallet2 = await walletsService.getByPubkey(draftWallet.pubkey);
    expect(foundWallet2.balance).toBe(666);
  });
});
