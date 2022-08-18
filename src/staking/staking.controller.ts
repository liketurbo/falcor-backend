import {
  BadRequestException,
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
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import parse from 'postgres-interval';
import { DataSource, Repository } from 'typeorm';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DATA_SOURCE,
  STAKE_REPOSITORY,
  WALLET_REPOSITORY,
} from '../database/constants/db-ids.constants';
import { Stake } from '../database/entities/stake.entity';
import { Wallet } from '../database/entities/wallet.entity';
import {
  INTERVAL_3_MONTHS,
  INTERVAL_6_MONTHS,
  INTERVAL_9_MONTHS,
} from './constants/intervals.constants';
import { CreateStakeDto } from './dto/create-stake.dto';

@Controller('staking')
@ApiTags('staking')
export class StakingController {
  private readonly logger = new Logger(StakingController.name);

  constructor(
    @Inject(DATA_SOURCE)
    private readonly dbConnection: DataSource,
    @Inject(STAKE_REPOSITORY)
    private readonly stakeRepository: Repository<Stake>,
    @Inject(WALLET_REPOSITORY)
    private readonly walletsRepository: Repository<Wallet>,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({
    type: String,
  })
  @ApiBearerAuth()
  async createStake(
    @Request() req,
    @Body() body: CreateStakeDto,
  ): Promise<string> {
    const { pubkey } = req.user;

    const INTERVALS = [INTERVAL_3_MONTHS, INTERVAL_6_MONTHS, INTERVAL_9_MONTHS];
    if (!INTERVALS.includes(body.period))
      throw new BadRequestException('Invalid interval provided');

    const foundWallet = await this.walletsRepository.findOneBy({
      pubkey,
    });
    if (foundWallet.balance < body.amount)
      throw new ForbiddenException('Insufficient balance');

    const queryRunner = this.dbConnection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const stake = this.stakeRepository.create({
        amount: body.amount,
        period: parse(body.period),
        owner: { pubkey },
      });
      await queryRunner.manager.save(Stake, stake);
      await queryRunner.manager.decrement(
        Wallet,
        { pubkey: foundWallet.pubkey },
        'balance',
        body.amount,
      );

      await queryRunner.commitTransaction();

      return 'Ok';
    } catch (err) {
      this.logger.error(err, body);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Stake creation failed');
    } finally {
      await queryRunner.release();
    }
  }
}
