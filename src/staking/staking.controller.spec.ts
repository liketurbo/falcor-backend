import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EthersModule } from 'nestjs-ethers';
import { DataSource, Repository } from 'typeorm';

import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import appConfig from '../common/config/app.config';
import {
  DATA_SOURCE,
  STAKE_REPOSITORY,
  TRANSACTION_REPOSITORY,
  WALLET_REPOSITORY,
} from '../database/constants/db-ids.constants';
import { DatabaseModule } from '../database/database.module';
import {
  StakeProvider,
  TransactionProvider,
  WalletProvider,
} from '../database/database.providers';
import { Stake } from '../database/entities/stake.entity';
import { Transaction } from '../database/entities/transaction.entity';
import { Wallet } from '../database/entities/wallet.entity';
import { TransactionsModule } from '../transactions/transactions.module';
import { WalletsController } from '../wallets/wallets.controller';
import { WalletsModule } from '../wallets/wallets.module';
import { WalletsService } from '../wallets/wallets.service';
import { InvalidInterval } from './errors/staking.errors';
import { StakingController } from './staking.controller';

describe('StakingController', () => {
  let authService: AuthService;
  let dbConnection: DataSource;
  let stakingController: StakingController;
  let stakeRepository: Repository<Stake>;
  let transactionRepository: Repository<Transaction>;
  let walletRepository: Repository<Wallet>;
  let walletsService: WalletsService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AuthModule,
        ConfigModule.forFeature(appConfig),
        DatabaseModule,
        EthersModule.forRoot(),
        TransactionsModule,
        WalletsModule,
      ],
      controllers: [StakingController, WalletsController],
      providers: [StakeProvider, TransactionProvider, WalletProvider],
    }).compile();

    authService = module.get(AuthService);
    dbConnection = module.get<DataSource>(DATA_SOURCE);
    stakingController = module.get<StakingController>(StakingController);
    stakeRepository = module.get<Repository<Stake>>(STAKE_REPOSITORY);
    transactionRepository = module.get<Repository<Transaction>>(
      TRANSACTION_REPOSITORY,
    );
    walletRepository = module.get<Repository<Wallet>>(WALLET_REPOSITORY);
    walletsService = module.get<WalletsService>(WalletsService);
  });

  afterAll(async () => {
    await dbConnection.destroy();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
    expect(dbConnection).toBeDefined();
    expect(stakingController).toBeDefined();
    expect(stakeRepository).toBeDefined();
    expect(transactionRepository).toBeDefined();
    expect(walletRepository).toBeDefined();
    expect(walletsService).toBeDefined();
  });

  it('works only with certain intervals', async () => {
    const draftWallet = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet);
    await walletsService.increaseBalance(draftWallet.pubkey, 10);

    await expect(
      stakingController.createStake(
        { user: { pubkey: draftWallet.pubkey } },
        {
          amount: 10,
          period: '01:02:03',
        },
      ),
    ).rejects.toBeInstanceOf(InvalidInterval);
  });

  it('created stake and decremented balance', async () => {
    const draftWallet = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet);
    await walletsService.increaseBalance(draftWallet.pubkey, 10);

    const createdStake = await stakingController.createStake(
      { user: { pubkey: draftWallet.pubkey } },
      {
        amount: 5,
        period: '3 mons',
      },
    );

    const wallet = await walletRepository.findOneBy({
      pubkey: draftWallet.pubkey,
    });
    expect(wallet.balance).toBeLessThan(10);
    const stake = await stakeRepository.findOneBy({
      id: createdStake.id,
    });
    expect(stake).toBeTruthy();
  });
});
