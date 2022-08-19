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
import { InvalidInterval, WithdrawNotAllowed } from './errors/staking.errors';
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
        { user: draftWallet },
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
      { user: draftWallet },
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

  it('returns total stakes', async () => {
    const draftWallet1 = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet1);
    await walletsService.increaseBalance(draftWallet1.pubkey, 100);
    const draftWallet2 = await walletsService.createDraft('0001');
    await walletsService.savePersonal(draftWallet2);
    await walletsService.increaseBalance(draftWallet2.pubkey, 100);

    const stake1 = await stakingController.createStake(
      { user: draftWallet1 },
      {
        amount: 5,
        period: '3 mons',
      },
    );
    const stake2 = await stakingController.createStake(
      { user: draftWallet1 },
      {
        amount: 8,
        period: '6 mons',
      },
    );
    await stakeRepository.update(
      {
        id: stake2.id,
      },
      {
        profitAmount: 11,
      },
    );
    await stakingController.createStake(
      { user: draftWallet2 },
      {
        amount: 18,
        period: '9 mons',
      },
    );

    const total = await stakingController.getTotal({ user: draftWallet1 });
    expect(total).toBe(stake1.holdAmount + stake2.holdAmount + 11);
  });

  it('returns hold stakes', async () => {
    const draftWallet1 = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet1);
    await walletsService.increaseBalance(draftWallet1.pubkey, 100);
    const draftWallet2 = await walletsService.createDraft('0001');
    await walletsService.savePersonal(draftWallet2);
    await walletsService.increaseBalance(draftWallet2.pubkey, 100);

    const stake1 = await stakingController.createStake(
      { user: draftWallet1 },
      {
        amount: 5,
        period: '3 mons',
      },
    );
    await stakeRepository.update(
      {
        id: stake1.id,
      },
      {
        frozen: false,
      },
    );
    const holdBalance1 = await stakingController.getHoldBalance({
      user: draftWallet1,
    });
    expect(holdBalance1).toBe(0);
    const stake2 = await stakingController.createStake(
      { user: draftWallet1 },
      {
        amount: 8,
        period: '6 mons',
      },
    );
    await stakeRepository.update(
      {
        id: stake2.id,
      },
      {
        profitAmount: 11,
      },
    );
    await stakingController.createStake(
      { user: draftWallet2 },
      {
        amount: 18,
        period: '9 mons',
      },
    );

    const holdBalance2 = await stakingController.getHoldBalance({
      user: draftWallet1,
    });
    expect(holdBalance2).toBe(stake2.holdAmount);
  });

  it('returns profit', async () => {
    const draftWallet1 = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet1);
    await walletsService.increaseBalance(draftWallet1.pubkey, 100);
    const draftWallet2 = await walletsService.createDraft('0001');
    await walletsService.savePersonal(draftWallet2);
    await walletsService.increaseBalance(draftWallet2.pubkey, 100);

    await stakingController.createStake(
      { user: draftWallet1 },
      {
        amount: 5,
        period: '3 mons',
      },
    );
    const stake2 = await stakingController.createStake(
      { user: draftWallet1 },
      {
        amount: 8,
        period: '6 mons',
      },
    );
    await stakeRepository.update(
      {
        id: stake2.id,
      },
      {
        profitAmount: 11,
      },
    );
    await stakingController.createStake(
      { user: draftWallet2 },
      {
        amount: 18,
        period: '9 mons',
      },
    );

    const profitAmount = await stakingController.getProfitAmount({
      user: draftWallet1,
    });
    expect(profitAmount).toBe(11);
  });

  it('withdraw stake', async () => {
    const draftWallet = await walletsService.createDraft('0000');
    await walletsService.savePersonal(draftWallet);
    await walletsService.increaseBalance(draftWallet.pubkey, 100);

    const stake = await stakingController.createStake(
      { user: draftWallet },
      {
        amount: 5,
        period: '3 mons',
      },
    );

    await expect(
      stakingController.withdrawStake(
        { user: draftWallet },
        {
          id: stake.id,
        },
      ),
    ).rejects.toBeInstanceOf(WithdrawNotAllowed);

    await stakeRepository.update(
      {
        id: stake.id,
      },
      {
        frozen: false,
      },
    );
    const transactions = await stakingController.withdrawStake(
      { user: draftWallet },
      {
        id: stake.id,
      },
    );
    expect(transactions.length).toBe(4);

    const foundWallet = await walletRepository.findOneBy({
      pubkey: draftWallet.pubkey,
    });
    expect(foundWallet.balance).toBeGreaterThan(0);
    const foundStake = await stakeRepository.findOneBy({
      id: stake.id,
    });
    expect(foundStake).toBeNull();
  });
});
