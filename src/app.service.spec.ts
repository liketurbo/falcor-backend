import { Test, TestingModule } from '@nestjs/testing';
import { EthersModule } from 'nestjs-ethers';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EthersModule.forRoot()],
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create new wallet', async () => {
    const newWallet = await service.createNewWallet('0000');

    expect(newWallet).toMatchObject({
      address: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
      pubkey: expect.stringMatching(/^0x[a-fA-F0-9]{130}$/),
      mnemonic: expect.stringMatching(/^(\b\w+\b\s?){12}$/),
      keystore: expect.any(String),
    });
  });

  it('restore wallet', async () => {
    const;
  });
});
