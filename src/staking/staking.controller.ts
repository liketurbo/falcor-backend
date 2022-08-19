import {
  Body,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import parse from 'postgres-interval';
import { Repository } from 'typeorm';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { STAKING_WALLET } from '../common/constants/service-wallets-names.constants';
import { NotFoundWallet } from '../common/errors/wallet.errors';
import {
  STAKE_REPOSITORY,
  WALLET_REPOSITORY,
} from '../database/constants/db-ids.constants';
import { Stake } from '../database/entities/stake.entity';
import { Transaction } from '../database/entities/transaction.entity';
import { Wallet } from '../database/entities/wallet.entity';
import { TransactionsService } from '../transactions/transactions.service';
import {
  INTERVAL_3_MONTHS,
  INTERVAL_6_MONTHS,
  INTERVAL_9_MONTHS,
} from './constants/intervals.constants';
import { CreateStakeDto } from './dto/create-stake.dto';
import { WithdrawStakeDto } from './dto/withdraw-stake.dto';
import {
  InvalidInterval,
  NotFoundStake,
  WithdrawNotAllowed,
} from './errors/staking.errors';

@Controller('staking')
@ApiTags('staking')
export class StakingController {
  private readonly logger = new Logger(StakingController.name);

  constructor(
    @Inject(STAKE_REPOSITORY)
    private readonly stakeRepository: Repository<Stake>,
    @Inject(WALLET_REPOSITORY)
    private readonly walletsRepository: Repository<Wallet>,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    type: Stake,
  })
  async createStake(
    @Request() req,
    @Body() body: CreateStakeDto,
  ): Promise<Stake> {
    const { pubkey } = req.user;

    const INTERVALS = [INTERVAL_3_MONTHS, INTERVAL_6_MONTHS, INTERVAL_9_MONTHS];
    if (!INTERVALS.includes(body.period)) throw new InvalidInterval();

    const stakingWallet = await this.walletsRepository.findOneBy({
      name: STAKING_WALLET,
    });
    if (!stakingWallet) throw new NotFoundWallet();

    const queryRunner = await this.transactionsService.open();

    try {
      await this.transactionsService.send(queryRunner, {
        from: pubkey,
        to: stakingWallet.pubkey,
        amount: body.amount,
      });
    } catch (err) {
      this.logger.error(err, body);
      await queryRunner.release();
      throw new InternalServerErrorException('Transaction failed');
    }

    try {
      const { leftAmount } = this.transactionsService.calcCommission(
        body.amount,
      );
      const stake = queryRunner.manager.create(Stake, {
        holdAmount: leftAmount,
        period: parse(body.period),
        owner: { pubkey },
        wallet: { pubkey: stakingWallet.pubkey },
      });
      await queryRunner.manager.save(stake);

      await queryRunner.commitTransaction();
      return stake;
    } catch (err) {
      this.logger.error(err, body);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Stake creation failed');
    } finally {
      await queryRunner.release();
    }
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCreatedResponse({
    type: Stake,
  })
  async withdrawStake(
    @Request() req,
    @Body() body: WithdrawStakeDto,
  ): Promise<Transaction[]> {
    const { pubkey } = req.user;

    const stake = await this.stakeRepository.findOne({
      where: {
        id: body.id,
      },
      loadRelationIds: true,
    });
    if (!stake) throw new NotFoundStake();
    if (stake.frozen || stake.owner !== pubkey) throw new WithdrawNotAllowed();

    const stakingWallet = await this.walletsRepository.findOneBy({
      name: STAKING_WALLET,
    });
    if (!stakingWallet) throw new NotFoundWallet();

    let transactions: Transaction[];
    const queryRunner = await this.transactionsService.open();
    try {
      transactions = await this.transactionsService.send(queryRunner, {
        from: stakingWallet.pubkey,
        to: stakingWallet.pubkey,
        // * It's possible that stake wallet won't have profit money
        // TODO: Consider to fetch profit money from an other wallet
        amount: stake.holdAmount + stake.profitAmount,
      });
    } catch (err) {
      this.logger.error(err, body);
      await queryRunner.release();
      throw new InternalServerErrorException('Transaction failed');
    }

    try {
      await queryRunner.manager.delete(Stake, {
        id: stake.id,
      });
      await queryRunner.commitTransaction();
      return transactions;
    } catch (err) {
      this.logger.error(err, body);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Stake deletion failed');
    } finally {
      await queryRunner.release();
    }
  }

  @Get('total-stake')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    type: Number,
  })
  async getTotal(@Request() req): Promise<number> {
    const { pubkey } = req.user;
    const { sum } = await this.stakeRepository
      .createQueryBuilder()
      .select('SUM(hold_amount + profit_amount)', 'sum')
      .where('owner_pubkey = :pubkey', { pubkey })
      .getRawOne();
    return sum;
  }

  @Get('hold-balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    type: Number,
  })
  async getHoldBalance(@Request() req): Promise<number> {
    const { pubkey } = req.user;
    const { sum } = await this.stakeRepository
      .createQueryBuilder()
      .select('SUM(hold_amount)', 'sum')
      .where('owner_pubkey = :pubkey', { pubkey })
      .andWhere('frozen = true')
      .getRawOne();
    return sum || 0;
  }

  @Get('profit-amount')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    type: Number,
  })
  async getProfitAmount(@Request() req) {
    const { pubkey } = req.user;
    const { sum } = await this.stakeRepository
      .createQueryBuilder()
      .select('SUM(profit_amount)', 'sum')
      .where('owner_pubkey = :pubkey', { pubkey })
      .getRawOne();
    return sum;
  }
}
