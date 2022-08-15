import { ForbiddenException } from '@nestjs/common';
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

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [EthersModule.forRoot(), DatabaseModule],
      controllers: [AppController],
      providers: [WalletProvider, AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    walletRepository = app.get<Repository<Wallet>>(WALLET_REPOSITORY);
    dbConnection = app.get<DataSource>(DATA_SOURCE);
  });

  afterAll(async () => {
    await dbConnection.destroy();
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
    expect(walletRepository).toBeDefined();
    expect(dbConnection).toBeDefined();
  });

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

  it('should fail cause of inefficient balance', async () => {
    const createdWallet = await appController.createWallet();
    await expect(
      appController.send({
        amount: 5,
        from: createdWallet.address,
        to: createdWallet.address,
      }),
    ).rejects.toEqual(new ForbiddenException('Inefficient balance'));
  });

  it("should fail cause of cause sender wallet doesn't exist", async () => {
    const createdWallet = await appController.createWallet();
    await expect(
      appController.send({
        amount: 5,
        from: 'createdWallet.address',
        to: createdWallet.address,
      }),
    ).rejects.toEqual(new ForbiddenException('Wallet not exists'));
  });

  it("should fail cause of cause receiver wallet doesn't exist", async () => {
    const createdWallet = await appController.createWallet();
    await expect(
      appController.send({
        amount: 5,
        from: createdWallet.address,
        to: 'createdWallet.address',
      }),
    ).rejects.toEqual(new ForbiddenException('Wallet not exists'));
  });
});
