import {
  Body,
  Controller,
  ForbiddenException,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { AppService } from './app.service';
import { WALLET_REPOSITORY } from './database/constants/db-ids.constants';
import { Transaction } from './database/entities/transaction.entity';
import { Wallet } from './database/entities/wallet.entity';
import { SendDto } from './dto/send.dto';

@Controller()
@ApiTags('Wallets')
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(WALLET_REPOSITORY)
    private readonly walletsRepository: Repository<Wallet>,
  ) {}

  @Post('create-wallet')
  @ApiCreatedResponse({
    type: Wallet,
    description: 'A newly created wallet',
  })
  async createWallet(): Promise<Wallet> {
    const randomWallet = await this.appService.createRandomWallet();
    const createdWallet = this.walletsRepository.create(randomWallet);
    await this.walletsRepository.save(createdWallet);
    return createdWallet;
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

    return 'Ok' as any;
  }
}
