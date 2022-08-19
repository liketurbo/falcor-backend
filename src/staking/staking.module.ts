import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from '../common/config/app.config';
import { DatabaseModule } from '../database/database.module';
import { StakeProvider, WalletProvider } from '../database/database.providers';
import { TransactionsModule } from '../transactions/transactions.module';
import { StakingController } from './staking.controller';

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    DatabaseModule,
    TransactionsModule,
  ],
  controllers: [StakingController],
  providers: [StakeProvider, WalletProvider],
})
export class StakingModule {}
