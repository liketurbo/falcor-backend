import {
  Body,
  Controller,
  ForbiddenException,
  Inject,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { EthersSigner, InjectSignerProvider } from 'nestjs-ethers';
import { DataSource, Repository } from 'typeorm';
import { AppService } from './app.service';
import {
  DATA_SOURCE,
  TRANSACTION_REPOSITORY,
  WALLET_REPOSITORY,
} from './database/constants/db-ids.constants';
import { Transaction } from './database/entities/transaction.entity';
import { Wallet } from './database/entities/wallet.entity';
import { CreateWalletReqDto } from './dto/create-wallet-req.dto';
import { CreateWalletResDto } from './dto/create-wallet-res.dto';
import { ImportWalletReqDto } from './dto/import-wallet-req.dto';
import { SendDto } from './dto/send.dto';
import { ServiceWalletsVariables } from './types';

@Controller()
@ApiTags('Wallets')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    @Inject(DATA_SOURCE)
    private readonly dbConnection: DataSource,
    @Inject(WALLET_REPOSITORY)
    private readonly walletsRepository: Repository<Wallet>,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectSignerProvider()
    private readonly ethersSigner: EthersSigner,
    private readonly configService: ConfigService<ServiceWalletsVariables>,
  ) {}

  @Post('create-wallet')
  @ApiCreatedResponse({
    type: CreateWalletResDto,
  })
  async createWallet(
    @Body() { password }: CreateWalletReqDto,
  ): Promise<CreateWalletResDto> {
    const randomWallet = this.ethersSigner.createRandomWallet();
    await this.walletsRepository.save({
      pubkey: randomWallet.publicKey,
      keystore: await randomWallet.encrypt(password),
    });
    return {
      mnemonic: randomWallet.mnemonic.phrase,
      jwt: '',
    };
  }

  @Post('import-wallet')
  async importWallet(@Body() { mnemonic, password }: ImportWalletReqDto) {
    const restoredWallet = this.ethersSigner.createWalletfromMnemonic(mnemonic);

    const foundWallet = await this.walletsRepository.findOneBy({
      pubkey: restoredWallet.publicKey,
    });
    if (!foundWallet) return new NotFoundException('Wallet not found');

    await this.walletsRepository.update(
      {
        pubkey: restoredWallet.publicKey,
      },
      {
        keystore: await restoredWallet.encrypt(password),
      },
    );

    return {
      jwt: '',
    };
  }

  @Post('send')
  @ApiCreatedResponse({
    type: Transaction,
    isArray: true,
    description: 'A newly created transaction',
  })
  async send(@Body() body: SendDto): Promise<Transaction[]> {
    const fromWallet = await this.walletsRepository.findOneBy({
      address: body.from,
    });
    const toWallet = await this.walletsRepository.findOneBy({
      address: body.to,
    });

    if (!(fromWallet && toWallet))
      throw new ForbiddenException('Wallet not exists');

    if (fromWallet.balance < body.amount)
      throw new ForbiddenException('Inefficient balance');

    const queryRunner = this.dbConnection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const transactions: Transaction[] = [];

    const commissionAmount = body.amount * 0.05;

    try {
      for (const id of ['1', '2', '3'] as const) {
        const serviceWallet = this.configService.get(
          id,
        ) as ServiceWalletsVariables['1'];
        const reward = (commissionAmount * serviceWallet.percentage) / 100;
        const transaction = this.transactionRepository.create({
          amount: reward,
          from: body.from,
          to: serviceWallet.address,
        });
        transactions.push(transaction);
        await queryRunner.manager.save(transaction);
        await queryRunner.manager.increment(
          Wallet,
          { address: serviceWallet.address },
          'balance',
          reward,
        );
      }

      const leftAmount = body.amount - commissionAmount;

      const transaction = this.transactionRepository.create({
        amount: leftAmount,
        from: body.from,
        to: body.to,
      });
      transactions.push(transaction);
      await queryRunner.manager.save(transaction);
      await queryRunner.manager.decrement(
        Wallet,
        { address: body.from },
        'balance',
        leftAmount,
      );
      await queryRunner.manager.increment(
        Wallet,
        { address: body.to },
        'balance',
        leftAmount,
      );

      await queryRunner.commitTransaction();
      return transactions;
    } catch (err) {
      this.logger.error(err, body);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException("Transaction didn't go through");
    } finally {
      await queryRunner.release();
    }
  }
}
