import { Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Wallet } from './database/entities/wallet.entity';

@Controller()
@ApiTags('Wallets')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('create-wallet')
  @ApiCreatedResponse({
    type: Wallet,
    description: 'A newly created wallet',
  })
  async createWallet(): Promise<Wallet> {
    const wallet = await this.appService.createRandomWallet();
    const createdWallet = this.appService.saveWallet(wallet);
    return createdWallet;
  }
}
