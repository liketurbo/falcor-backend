import {
  Body,
  Controller,
  ForbiddenException,
  Inject,
  InternalServerErrorException,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { DataSource, Repository } from 'typeorm';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DATA_SOURCE,
  TRANSACTION_REPOSITORY,
  WALLET_REPOSITORY,
} from '../database/constants/db-ids.constants';
import { Transaction } from '../database/entities/transaction.entity';
import { Wallet } from '../database/entities/wallet.entity';
import { ServiceWalletsVariables } from '../types';
import { SendTransactionDto } from './dto/send-transaction.dto';

@Controller('transactions')
@ApiTags('transactions')
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(
    private readonly configService: ConfigService<ServiceWalletsVariables>,
    @Inject(DATA_SOURCE)
    private readonly dbConnection: DataSource,
    @Inject(WALLET_REPOSITORY)
    private readonly walletsRepository: Repository<Wallet>,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    type: Transaction,
    isArray: true,
    description: 'A newly created transaction',
  })
  async send(
    @Request() req,
    @Body() body: SendTransactionDto,
  ): Promise<Transaction[]> {
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
