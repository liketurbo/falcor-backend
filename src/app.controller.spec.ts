import { ForbiddenException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { EthersModule } from 'nestjs-ethers';
import { DataSource, Repository } from 'typeorm';
import { AppController } from './app.controller';
import serviceWalletsConfig from './config/service-wallets.config';
import {
  DATA_SOURCE,
  WALLET_REPOSITORY,
} from './database/constants/db-ids.constants';
import { DatabaseModule } from './database/database.module';
import {
  TransactionProvider,
  WalletProvider,
} from './database/database.providers';
import { Wallet } from './database/entities/wallet.entity';

describe('AppController', () => {
  let appController: AppController;
  let dbConnection: DataSource;
  let walletRepository: Repository<Wallet>;
  let jwtService: JwtService;

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        EthersModule.forRoot(),
        DatabaseModule,
        ConfigModule.forFeature(serviceWalletsConfig),
        JwtModule.register({
          secret: 'hard!to-guess_secret',
        }),
      ],
      controllers: [AppController],
      providers: [WalletProvider, TransactionProvider],
    }).compile();

    appController = app.get<AppController>(AppController);
    walletRepository = app.get<Repository<Wallet>>(WALLET_REPOSITORY);
    dbConnection = app.get<DataSource>(DATA_SOURCE);
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    await dbConnection.destroy();
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
    expect(walletRepository).toBeDefined();
    expect(dbConnection).toBeDefined();
    expect(jwtService).toBeDefined();
  });

  it('should create a wallet', async () => {
    const res = await appController.createWallet({
      password: '0000',
    });
    expect(res).toMatchObject({
      mnemonic: expect.stringMatching(/^(\b\w+\b\s?){12}$/),
      accessToken: expect.stringMatching(/^[\w-]*\.[\w-]*\.[\w-]*$/),
    });
    const decoded = jwtService.decode(res.accessToken) as Record<
      string,
      string
    >;
    const foundWallet = await walletRepository.findOneByOrFail({
      pubkey: decoded.pubkey,
    });
    expect(foundWallet).toBeTruthy();
    expect(foundWallet.balance).toBe(0);
    expect(foundWallet.createdAt).toBeInstanceOf(Date);
  });

  it('should import a wallet', async () => {
    const res1 = await appController.createWallet({
      password: '0000',
    });
    const decoded1 = jwtService.decode(res1.accessToken) as Record<
      string,
      string
    >;
    const res2 = (await appController.importWallet({
      mnemonic: res1.mnemonic,
      password: '0000',
    })) as { accessToken: string };
    const decoded2 = jwtService.decode(res2.accessToken) as Record<
      string,
      string
    >;
    expect(decoded1.pubkey).toBe(decoded2.pubkey);
  }, 10e3);

  it('should get a wallet', async () => {
    const res = await appController.createWallet({
      password: '0000',
    });
    const decoded = jwtService.decode(res.accessToken) as Record<
      string,
      string
    >;
    const wallet = appController.getWallet({ user: decoded });
    expect(wallet).toBeTruthy();
  });

  it('should fail cause of inefficient balance', async () => {
    const res = await appController.createWallet({
      password: '0000',
    });
    const decoded = jwtService.decode(res.accessToken) as Record<
      string,
      string
    >;
    await expect(
      appController.send(
        { user: decoded },
        {
          amount: 5,
          to: decoded.pubkey,
        },
      ),
    ).rejects.toEqual(new ForbiddenException('Inefficient balance'));
  });

  it("should fail cause of cause receiver wallet doesn't exist", async () => {
    const res = await appController.createWallet({
      password: '0000',
    });
    const decoded = jwtService.decode(res.accessToken) as Record<
      string,
      string
    >;
    await expect(
      appController.send(
        { user: decoded },
        {
          amount: 5,
          to: 'createdWallet.address',
        },
      ),
    ).rejects.toEqual(new ForbiddenException('Wallet not exists'));
  });

  it('return 5 transactions', async () => {
    const res1 = await appController.createWallet({ password: '0000' });
    const decoded1 = jwtService.decode(res1.accessToken) as Record<
      string,
      string
    >;
    const res2 = await appController.createWallet({ password: '0000' });
    const decoded2 = jwtService.decode(res2.accessToken) as Record<
      string,
      string
    >;
    await walletRepository.increment(
      {
        pubkey: decoded1.pubkey,
      },
      'balance',
      10,
    );
    expect(
      (
        await appController.send(
          { user: decoded1 },
          {
            amount: 10,
            to: decoded2.pubkey,
          },
        )
      ).length,
    ).toBe(4);
  }, 10e3);
});
