import { Test, TestingModule } from '@nestjs/testing';
import { EthersModule } from 'nestjs-ethers';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [EthersModule.forRoot()],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should create a wallet', async () => {
      expect(await appController.createWallet()).toMatchObject({
        address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
        mnemonic: expect.stringMatching(/^(\b\w+\b\s?){12}$/),
      });
    });
  });
});
