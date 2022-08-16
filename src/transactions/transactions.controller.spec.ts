import { ForbiddenException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EthersModule } from 'nestjs-ethers';
import { DataSource, Repository } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import serviceWalletsConfig from '../common/config/service-wallets.config';
import {
  DATA_SOURCE,
  WALLET_REPOSITORY,
} from '../database/constants/db-ids.constants';
import { DatabaseModule } from '../database/database.module';
import {
  TransactionProvider,
  WalletProvider,
} from '../database/database.providers';
import { Wallet } from '../database/entities/wallet.entity';
import { WalletsController } from '../wallets/wallets.controller';
import { TransactionsController } from './transactions.controller';

describe('TransactionsController', () => {
  let dbConnection: DataSource;
  let transactionsController: TransactionsController;
  let walletsController: WalletsController;
  let walletRepository: Repository<Wallet>;
  let authService: AuthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AuthModule,
        ConfigModule.forFeature(serviceWalletsConfig),
        DatabaseModule,
        EthersModule.forRoot(),
      ],
      controllers: [TransactionsController, WalletsController],
      providers: [TransactionProvider, WalletProvider],
    }).compile();

    dbConnection = module.get<DataSource>(DATA_SOURCE);
    transactionsController = module.get<TransactionsController>(
      TransactionsController,
    );
    walletsController = module.get<WalletsController>(WalletsController);
    walletRepository = module.get<Repository<Wallet>>(WALLET_REPOSITORY);
    authService = module.get(AuthService);
  });

  afterAll(async () => {
    await dbConnection.destroy();
  });

  it('should be defined', () => {
    expect(dbConnection).toBeDefined();
    expect(transactionsController).toBeDefined();
    expect(walletsController).toBeDefined();
    expect(walletRepository).toBeDefined();
    expect(authService).toBeDefined();
  });

  it('should fail cause of inefficient balance', async () => {
    const res = await walletsController.createWallet({
      password: '0000',
    });
    const pubkey = authService.validate(res.accessToken);
    await expect(
      transactionsController.send(
        { user: { pubkey } },
        {
          amount: 5,
          to: pubkey,
        },
      ),
    ).rejects.toEqual(new ForbiddenException('Inefficient balance'));
  });

  it("should fail cause of cause receiver wallet doesn't exist", async () => {
    const res = await walletsController.createWallet({
      password: '0000',
    });
    const pubkey = authService.validate(res.accessToken);
    await expect(
      transactionsController.send(
        { user: { pubkey } },
        {
          amount: 5,
          to: 'createdWallet.address',
        },
      ),
    ).rejects.toEqual(new ForbiddenException('Wallet not exists'));
  });

  it('return 4 transactions', async () => {
    const res1 = await walletsController.createWallet({ password: '0000' });
    const pubkey1 = authService.validate(res1.accessToken);
    const res2 = await walletsController.createWallet({ password: '0000' });
    const pubkey2 = authService.validate(res2.accessToken);
    await walletRepository.increment(
      {
        pubkey: pubkey1,
      },
      'balance',
      10,
    );
    expect(
      (
        await transactionsController.send(
          { user: { pubkey: pubkey1 } },
          {
            amount: 10,
            to: pubkey2,
          },
        )
      ).length,
    ).toBe(4);
  }, 10e3);
});
