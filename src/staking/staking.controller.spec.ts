import { Test, TestingModule } from '@nestjs/testing';
import { EthersModule } from 'nestjs-ethers';
import { DataSource } from 'typeorm';

import { AuthModule } from '../auth/auth.module';
import { DATA_SOURCE } from '../database/constants/db-ids.constants';
import { DatabaseModule } from '../database/database.module';
import { StakeProvider, WalletProvider } from '../database/database.providers';
import { WalletsController } from '../wallets/wallets.controller';
import { StakingController } from './staking.controller';

describe('StakingController', () => {
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
  });

  afterAll(async () => {
    await dbConnection.destroy();
  });

  it('should be defined', () => {
    expect(stakingController).toBeDefined();
    expect(walletsController).toBeDefined();
  });
});
