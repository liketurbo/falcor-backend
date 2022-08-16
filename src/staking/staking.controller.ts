import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import parse from 'postgres-interval';
import { Repository } from 'typeorm';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { STAKE_REPOSITORY } from '../database/constants/db-ids.constants';
import { Stake } from '../database/entities/stake.entity';
import {
  INTERVAL_3_MONTHS,
  INTERVAL_6_MONTHS,
  INTERVAL_9_MONTHS,
} from './constants/intervals.constants';
import { CreateStakeDto } from './dto/create-stake.dto';

@Controller('staking')
@ApiTags('staking')
export class StakingController {
  constructor(
    @Inject(STAKE_REPOSITORY)
    private readonly stakeRepository: Repository<Stake>,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiCreatedResponse({
    type: String,
  })
  @ApiBearerAuth()
  async createStake(
    @Request() req,
    @Body() { amount, period }: CreateStakeDto,
  ): Promise<string> {
    const { pubkey } = req.user;

    const INTERVALS = [INTERVAL_3_MONTHS, INTERVAL_6_MONTHS, INTERVAL_9_MONTHS];
    if (!INTERVALS.includes(period))
      throw new BadRequestException('Invalid interval provided');

    const stake = this.stakeRepository.create({
      amount,
      period: parse(period),
      owner: { pubkey },
    });
    await this.stakeRepository.save(stake);

    return 'Ok';
  }
}
