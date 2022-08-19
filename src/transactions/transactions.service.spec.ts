import { forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import appConfig from '../common/config/app.config';
import {
  InsufficientBalance,
  NotFoundWallet,
} from '../common/errors/wallet.errors';
import { DATA_SOURCE } from '../database/constants/db-ids.constants';
import { DatabaseModule } from '../database/database.module';
import {
  TransactionProvider,
  WalletProvider,
} from '../database/database.providers';
import { WalletsModule } from '../wallets/wallets.module';
import { WalletsService } from '../wallets/wallets.service';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let dbConnection: DataSource;
  let transactionsService: TransactionsService;
  let walletsService: WalletsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forFeature(appConfig),
        DatabaseModule,
        forwardRef(() => WalletsModule),
      ],
      providers: [TransactionProvider, WalletProvider, TransactionsService],
    }).compile();

    dbConnection = module.get<DataSource>(DATA_SOURCE);
    transactionsService = module.get<TransactionsService>(TransactionsService);
    walletsService = module.get<WalletsService>(WalletsService);
  });

  afterAll(async () => {
    await dbConnection.destroy();
  });

  it('should be defined', () => {
    expect(transactionsService).toBeDefined();
    expect(walletsService).toBeDefined();
  });

  it('send transaction', async () => {
    const draftWallet1 = await walletsService.createDraft('0000');
    await walletsService.save(draftWallet1);
    const draftWallet2 = await walletsService.createDraft('0001');

    const queryRunner = await transactionsService.start();
    await expect(
      transactionsService.send(queryRunner, {
        from: draftWallet1.pubkey,
        to: draftWallet2.pubkey,
        amount: 4,
      }),
    ).rejects.toBeInstanceOf(NotFoundWallet);
    await walletsService.save(draftWallet2);

    await expect(
      transactionsService.send(queryRunner, {
        from: draftWallet1.pubkey,
        to: draftWallet2.pubkey,
        amount: 4,
      }),
    ).rejects.toBeInstanceOf(InsufficientBalance);
    await walletsService.increaseBalance(draftWallet1.pubkey, 10);

    const transactions = await transactionsService.send(queryRunner, {
      from: draftWallet1.pubkey,
      to: draftWallet2.pubkey,
      amount: 10,
    });
    await transactionsService.finish(queryRunner);
    expect(transactions.length).toBe(4);
  });
});
