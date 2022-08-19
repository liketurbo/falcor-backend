import {
  Body,
  Controller,
  Inject,
  InternalServerErrorException,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
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
import { Wallet } from '../database/entities/wallet.entity';
import { TransactionsService } from '../transactions/transactions.service';
import {
  INTERVAL_3_MONTHS,
  INTERVAL_6_MONTHS,
  INTERVAL_9_MONTHS,
} from './constants/intervals.constants';
import { CreateStakeDto } from './dto/create-stake.dto';
import { InvalidInterval } from './errors/staking.errors';

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
  @ApiCreatedResponse({
    type: Stake,
  })
  @ApiBearerAuth()
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
      const stake = queryRunner.manager.create(Stake, {
        amount: body.amount,
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
}
