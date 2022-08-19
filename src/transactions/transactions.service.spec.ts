import { forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';

import appConfig from '../common/config/app.config';
import {
  InsufficientBalance,
  NotFoundWallet,
} from '../common/errors/wallet.errors';
import {
  DATA_SOURCE,
  TRANSACTION_REPOSITORY,
} from '../database/constants/db-ids.constants';
import { DatabaseModule } from '../database/database.module';
import {
  TransactionProvider,
  WalletProvider,
} from '../database/database.providers';
import { Transaction } from '../database/entities/transaction.entity';
import { WalletsModule } from '../wallets/wallets.module';
import { WalletsService } from '../wallets/wallets.service';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let dbConnection: DataSource;
  let transactionRepository: Repository<Transaction>;
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
    transactionRepository = module.get<Repository<Transaction>>(
      TRANSACTION_REPOSITORY,
    );
    transactionsService = module.get<TransactionsService>(TransactionsService);
    walletsService = module.get<WalletsService>(WalletsService);
  });

  afterAll(async () => {
    await dbConnection.destroy();
  });

  it('should be defined', () => {
    expect(dbConnection).toBeDefined();
    expect(transactionRepository).toBeDefined();
    expect(transactionsService).toBeDefined();
    expect(walletsService).toBeDefined();
  });

  it('send transaction', async () => {
    const draftWallet1 = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet1);
    const draftWallet2 = await walletsService.createDraft('0001');

    const queryRunner = await transactionsService.open();
    await expect(
      transactionsService.send(queryRunner, {
        from: draftWallet1.pubkey,
        to: draftWallet2.pubkey,
        amount: 4,
      }),
    ).rejects.toBeInstanceOf(NotFoundWallet);
    await walletsService.savePersonal(draftWallet2);

    await expect(
      transactionsService.send(queryRunner, {
        from: draftWallet1.pubkey,
        to: draftWallet2.pubkey,
        amount: 4,
      }),
    ).rejects.toBeInstanceOf(InsufficientBalance);
    await walletsService.increaseBalance(draftWallet1.pubkey, 10);

    await transactionsService.send(queryRunner, {
      from: draftWallet1.pubkey,
      to: draftWallet2.pubkey,
      amount: 10,
    });
    await queryRunner.commitTransaction();
    await queryRunner.release();
    const transactions = await transactionRepository.findBy({
      from: draftWallet1.pubkey,
    });
    expect(transactions.length).toBe(4);
  });
});
