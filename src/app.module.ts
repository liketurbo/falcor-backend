import { Module } from '@nestjs/common';
import { WalletsModule } from './wallets/wallets.module';
import { AuthModule } from './auth/auth.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [WalletsModule, AuthModule, TransactionsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
