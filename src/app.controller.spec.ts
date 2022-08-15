import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { EthersModule } from 'nestjs-ethers';
import { Repository } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Wallet } from './entities/wallet.entity';

describe('AppController', () => {
  let appController: AppController;
  let walletRepository: Repository<Wallet>;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        EthersModule.forRoot(),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'example',
          database: 'postgres',
          synchronize: true,
          logging: true,
          entities: [Wallet],
          subscribers: [],
          migrations: [],
        }),
        TypeOrmModule.forFeature([Wallet]),
      ],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    walletRepository = app.get<Repository<Wallet>>(getRepositoryToken(Wallet));
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
    expect(walletRepository).toBeDefined();
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
