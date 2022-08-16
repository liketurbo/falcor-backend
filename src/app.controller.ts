import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { EthersSigner, InjectSignerProvider } from 'nestjs-ethers';
import { DataSource, Repository } from 'typeorm';
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
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ServiceWalletsVariables } from './types';

@Controller()
@ApiTags('Wallets')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @Inject(DATA_SOURCE)
    private readonly dbConnection: DataSource,
    @Inject(WALLET_REPOSITORY)
    private readonly walletsRepository: Repository<Wallet>,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectSignerProvider()
    private readonly ethersSigner: EthersSigner,
    private readonly configService: ConfigService<ServiceWalletsVariables>,
    private readonly jwtService: JwtService,
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
      accessToken: this.jwtService.sign({ pubkey: randomWallet.publicKey }),
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
      accessToken: this.jwtService.sign({ pubkey: restoredWallet.publicKey }),
    };
  }

  @Get('get-wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getWallet(@Request() req) {
    const { pubkey } = req.user;
    return this.walletsRepository.findOneByOrFail({
      pubkey,
    });
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    type: Transaction,
    isArray: true,
    description: 'A newly created transaction',
  })
  async send(@Request() req, @Body() body: SendDto): Promise<Transaction[]> {
    const { pubkey } = req.user;

    const fromWallet = await this.walletsRepository.findOneBy({
      pubkey,
    });
    const toWallet = await this.walletsRepository.findOneBy({
      pubkey: body.to,
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
          from: pubkey,
          to: serviceWallet.address,
        });
        transactions.push(transaction);
        await queryRunner.manager.save(transaction);
        await queryRunner.manager.increment(
          Wallet,
          { pubkey: serviceWallet.pubkey },
          'balance',
          reward,
        );
      }

      const leftAmount = body.amount - commissionAmount;

      const transaction = this.transactionRepository.create({
        amount: leftAmount,
        from: pubkey,
        to: body.to,
      });
      transactions.push(transaction);
      await queryRunner.manager.save(transaction);
      await queryRunner.manager.decrement(
        Wallet,
        { pubkey },
        'balance',
        leftAmount,
      );
      await queryRunner.manager.increment(
        Wallet,
        { pubkey: body.to },
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
