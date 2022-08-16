import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EthersModule } from 'nestjs-ethers';
import { DataSource, Repository } from 'typeorm';
import { WalletsController } from './wallets.controller';
import serviceWalletsConfig from '../common/config/service-wallets.config';
import { SERVICE_WALLET } from './constants/wallet-types.constants';
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
import { AuthModule } from '../auth/auth.module';
import { AuthService } from '../auth/auth.service';

describe('WalletsController', () => {
  let dbConnection: DataSource;
  let walletsController: WalletsController;
  let walletRepository: Repository<Wallet>;
  let authService: AuthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        EthersModule.forRoot(),
        DatabaseModule,
        ConfigModule.forFeature(serviceWalletsConfig),
        AuthModule,
      ],
      controllers: [WalletsController],
      providers: [WalletProvider, TransactionProvider],
    }).compile();

    dbConnection = module.get<DataSource>(DATA_SOURCE);
    walletsController = module.get<WalletsController>(WalletsController);
    walletRepository = module.get<Repository<Wallet>>(WALLET_REPOSITORY);
    authService = module.get(AuthService);
  });

  afterAll(async () => {
    await dbConnection.destroy();
  });

  it('should be defined', () => {
    expect(dbConnection).toBeDefined();
    expect(walletsController).toBeDefined();
    expect(walletRepository).toBeDefined();
    expect(authService).toBeDefined();
  });

  it('should create a wallet', async () => {
    const res = await walletsController.createWallet({
      password: '0000',
    });
    expect(res).toMatchObject({
      mnemonic: expect.stringMatching(/^(\b\w+\b\s?){12}$/),
      accessToken: expect.stringMatching(/^[\w-]*\.[\w-]*\.[\w-]*$/),
    });
    const pubkey = authService.validate(res.accessToken);
    const foundWallet = await walletRepository.findOneByOrFail({
      pubkey: pubkey,
    });
    expect(foundWallet).toBeTruthy();
    expect(foundWallet.balance).toBe(0);
    expect(foundWallet.createdAt).toBeInstanceOf(Date);
  });

  it('should import a wallet', async () => {
    const res1 = await walletsController.createWallet({
      password: '0000',
    });
    const pubkey1 = authService.validate(res1.accessToken);
    const res2 = (await walletsController.importWallet({
      mnemonic: res1.mnemonic,
      password: '0000',
    })) as { accessToken: string };
    const pubkey2 = authService.validate(res2.accessToken);
    expect(pubkey1).toBe(pubkey2);
  }, 10e3);

  it('should get a wallet', async () => {
    const res = await walletsController.createWallet({
      password: '0000',
    });
    const pubkey = authService.validate(res.accessToken);
    const wallet = walletsController.getCurrent({ user: { pubkey } });
    expect(wallet).toBeTruthy();
  });

  it('faucet wallet balance', async () => {
    const res1 = await walletsController.createWallet({ password: '0000' });
    const pubkey = authService.validate(res1.accessToken);

    const wallet1 = await walletRepository.findOneBy({
      pubkey,
    });
    const res2 = await walletsController.faucet({
      amount: 612,
      pubkey,
    });
    expect(res2).toBe('Ok');
    const wallet2 = await walletRepository.findOneBy({
      pubkey,
    });
    expect(wallet1.balance + 612).toBe(wallet2.balance);
  });

  it('get service wallets', async () => {
    const wallets = await walletsController.getPools();
    expect(wallets.length).toBe(4);
    for (const wallet of wallets) {
      expect(wallet).toMatchObject({
        type: SERVICE_WALLET,
      });
    }
  });
});
