import { Module } from '@nestjs/common';

import { StakingModule } from './staking/staking.module';
import { TransactionsModule } from './transactions/transactions.module';
import { WalletsModule } from './wallets/wallets.module';

@Module({
  imports: [StakingModule, TransactionsModule, WalletsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
