import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RandomWallet } from './types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('create-wallet')
  async createWallet(): Promise<RandomWallet> {
    const wallet = await this.appService.createWallet();
    return wallet;
  }
}
