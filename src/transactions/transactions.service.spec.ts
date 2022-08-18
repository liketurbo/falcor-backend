import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import appConfig from '../common/config/app.config';
import { DATA_SOURCE } from '../database/constants/db-ids.constants';
import { DatabaseModule } from '../database/database.module';
import { TransactionProvider } from '../database/database.providers';
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

  it('should fail cause of Insufficient balance', async () => {
    const draftWallet = await walletsService.createDraft('0000');
    await walletsService.save(draftWallet);
    await expect(
      transactionsService.send(draftWallet.pubkey, draftWallet.pubkey, 5),
    ).rejects.toEqual(new ForbiddenException('Insufficient balance'));
  });

  it("should fail cause of cause receiver wallet doesn't exist", async () => {
    const draftWallet = await walletsService.createDraft('0000');
    await walletsService.save(draftWallet);
    await expect(
      transactionsService.send(draftWallet.pubkey, 'createdWallet.address', 5),
    ).rejects.toEqual(new NotFoundException('Wallet not found'));
  });

  it('return 4 transactions', async () => {
    const draftWallet1 = await walletsService.createDraft('0000');
    await walletsService.save(draftWallet1);
    const draftWallet2 = await walletsService.createDraft('0000');
    await walletsService.save(draftWallet2);
    await walletsService.increaseBalance(draftWallet1.pubkey, 10);
    expect(
      (
        await transactionsService.send(
          draftWallet1.pubkey,
          draftWallet2.pubkey,
          10,
        )
      ).length,
    ).toBe(4);
  });
});
