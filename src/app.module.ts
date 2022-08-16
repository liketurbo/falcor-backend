import { Module } from '@nestjs/common';
import { WalletsModule } from './wallets/wallets.module';
import { TransactionsModule } from './transactions/transactions.module';
import { StakingModule } from './staking/staking.module';

@Module({
  imports: [StakingModule, TransactionsModule, WalletsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
