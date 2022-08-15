import { Test, TestingModule } from '@nestjs/testing';
import { EthersModule } from 'nestjs-ethers';
import { DataSource, Repository } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  DATA_SOURCE,
  WALLET_REPOSITORY,
} from './database/constants/db-ids.constants';
import { DatabaseModule } from './database/database.module';
import { WalletProvider } from './database/database.providers';
import { Wallet } from './database/entities/wallet.entity';

describe('AppController', () => {
  let appController: AppController;
  let dbConnection: DataSource;
  let walletRepository: Repository<Wallet>;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [EthersModule.forRoot(), DatabaseModule],
      controllers: [AppController],
      providers: [WalletProvider, AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    walletRepository = app.get<Repository<Wallet>>(WALLET_REPOSITORY);
    dbConnection = app.get<DataSource>(DATA_SOURCE);
  });

  afterEach(async () => {
    await dbConnection.destroy();
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
    expect(walletRepository).toBeDefined();
    expect(dbConnection).toBeDefined();
  });

  describe('root', () => {
    it('should create a wallet', async () => {
      const createdWallet = await appController.createWallet();

      expect(createdWallet).toMatchObject({
        address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
        pubkey: expect.stringMatching(/^0x[a-fA-F0-9]{130}$/),
        mnemonic: expect.stringMatching(/^(\b\w+\b\s?){12}$/),
      });

      const foundWallet = await walletRepository.findOneBy({
        address: createdWallet.address,
        pubkey: createdWallet.pubkey,
        mnemonic: createdWallet.mnemonic,
      });

      expect(foundWallet).toBeTruthy();
      expect(foundWallet.balance).toBe(0);
      expect(foundWallet.createdAt).toBeInstanceOf(Date);
    });
  });
});
