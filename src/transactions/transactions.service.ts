import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner, Repository } from 'typeorm';

import {
  InsufficientBalance,
  NotFoundWallet,
} from '../common/errors/wallet.errors';
import {
  DATA_SOURCE,
  TRANSACTION_REPOSITORY,
  WALLET_REPOSITORY,
} from '../database/constants/db-ids.constants';
import { Transaction } from '../database/entities/transaction.entity';
import { Wallet } from '../database/entities/wallet.entity';
import { AppVariables, PublicKey } from '../types';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly config: ConfigService<AppVariables>,
    @Inject(DATA_SOURCE)
    private readonly dbConnection: DataSource,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: Repository<Transaction>,
    @Inject(WALLET_REPOSITORY)
    private readonly walletsRepository: Repository<Wallet>,
  ) {}

  async start() {
    const queryRunner = this.dbConnection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return queryRunner;
  }

  async finish(queryRunner: QueryRunner) {
    await queryRunner.release();
  }

  async send(
    queryRunner: QueryRunner,
    { from, to, amount }: { from: PublicKey; to: PublicKey; amount: number },
  ): Promise<Transaction[]> {
    if (amount <= 0) throw new BadRequestException('Amount is not positive');

    const sender = await this.walletsRepository.findOneBy({ pubkey: from });
    const receiver = await this.walletsRepository.findOneBy({ pubkey: to });

    if (!sender || !receiver) throw new NotFoundWallet();

    if (sender.balance < amount) throw new InsufficientBalance();

    const { leftAmount, commissionAmount } = this.calcCommission(amount);

    const transactions: Transaction[] = [];

    try {
      const transaction = this.transactionRepository.create({
        amount: leftAmount,
        from,
        to,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.manager.decrement(
        Wallet,
        { pubkey: from },
        'balance',
        leftAmount,
      );
      await queryRunner.manager.increment(
        Wallet,
        { pubkey: to },
        'balance',
        leftAmount,
      );

      transactions.push(transaction);
    } catch (err) {
      this.logger.error(err, { from, to, amount: leftAmount });
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException("Transfer didn't go through");
    }

    transactions.push(
      ...(await this.sendCommissions(queryRunner, {
        from,
        amount: commissionAmount,
      })),
    );

    return transactions;
  }

  private async sendCommissions(
    queryRunner: QueryRunner,
    {
      from,
      amount,
    }: {
      from: PublicKey;
      amount: number;
    },
  ) {
    if (amount <= 0) throw new BadRequestException('Amount is not positive');

    const sender = await this.walletsRepository.findOneBy({ pubkey: from });
    if (!sender) throw new NotFoundWallet();

    if (sender.balance < amount) throw new InsufficientBalance();

    const transactions: Transaction[] = [];
    const serviceWallets =
      this.config.get<AppVariables['serviceWallets']>('serviceWallets');

    try {
      for (const wallet of serviceWallets) {
        const reward = (amount * wallet.percentage) / 100;
        if (reward === 0) continue;

        const transaction = this.transactionRepository.create({
          amount: reward,
          from,
          to: wallet.pubkey,
        });
        transactions.push(transaction);
        await queryRunner.manager.save(Transaction, transaction);
        await queryRunner.manager.increment(
          Wallet,
          { pubkey: wallet.pubkey },
          'balance',
          reward,
        );
      }

      return transactions;
    } catch (err) {
      this.logger.error(err, { from, amount });
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException("Transfers didn't go through");
    }
  }

  private calcCommission(amount: number) {
    const commissionAmount =
      (amount * this.config.get('commissionPercentage')) / 100;
    const leftAmount = amount - commissionAmount;
    return {
      commissionAmount,
      leftAmount,
    };
  }
}
