import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import appConfig from '../common/config/app.config';
import { DATA_SOURCE } from '../database/constants/db-ids.constants';
import { DatabaseModule } from '../database/database.module';
import { TransactionProvider } from '../database/database.providers';
import { Transaction } from '../database/entities/transaction.entity';
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
        WalletsModule,
      ],
      providers: [TransactionProvider, TransactionsService],
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

  it('return 4 transactions', async () => {
    const draftWallet1 = await walletsService.createDraft('0000');
    await walletsService.save(draftWallet1);
    const draftWallet2 = await walletsService.createDraft('0000');
    await walletsService.save(draftWallet2);
    await walletsService.increaseBalance(draftWallet1.pubkey, 10);

    const transactions: Transaction[] = [];
    const queryRunner = await transactionsService.start();
    const { commissionAmount, leftAmount } =
      transactionsService.calcCommission(10);
    transactions.push(
      await transactionsService.sendBetween(queryRunner, {
        from: draftWallet1.pubkey,
        to: draftWallet2.pubkey,
        amount: leftAmount,
      }),
    );
    transactions.push(
      ...(await transactionsService.sendCommissions(queryRunner, {
        from: draftWallet1.pubkey,
        amount: commissionAmount,
      })),
    );
    await transactionsService.finish(queryRunner);
    expect(transactions.length).toBe(4);
  });
});
