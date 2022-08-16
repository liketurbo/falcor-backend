import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EthersModule } from 'nestjs-ethers';
import { DataSource } from 'typeorm';

import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';
import { DATA_SOURCE } from '../database/constants/db-ids.constants';
import { DatabaseModule } from '../database/database.module';
import { StakeProvider, WalletProvider } from '../database/database.providers';
import { WalletsController } from '../wallets/wallets.controller';
import { StakingController } from './staking.controller';

describe('StakingController', () => {
  let authService: AuthService;
  let dbConnection: DataSource;
  let stakingController: StakingController;
  let walletsController: WalletsController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, DatabaseModule, EthersModule.forRoot()],
      controllers: [StakingController, WalletsController],
      providers: [StakeProvider, WalletProvider],
    }).compile();

    dbConnection = module.get<DataSource>(DATA_SOURCE);
    stakingController = module.get<StakingController>(StakingController);
    walletsController = module.get<WalletsController>(WalletsController);
    authService = module.get(AuthService);
  });

  afterAll(async () => {
    await dbConnection.destroy();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
    expect(dbConnection).toBeDefined();
    expect(stakingController).toBeDefined();
    expect(walletsController).toBeDefined();
  });

  it('works only with certain intervals', async () => {
    const res1 = await walletsController.createWallet({
      password: '0000',
    });
    const pubkey = authService.validate(res1.accessToken);
    const res2 = await stakingController.createStake(
      { user: { pubkey } },
      {
        amount: 10,
        period: '6 mons',
      },
    );
    expect(res2).toBe('Ok');

    await expect(
      stakingController.createStake(
        { user: { pubkey } },
        {
          amount: 10,
          period: '01:02:03',
        },
      ),
    ).rejects.toEqual(new BadRequestException('Invalid interval provided'));
  });
});
