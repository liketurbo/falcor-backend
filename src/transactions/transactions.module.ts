import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EthersModule } from 'nestjs-ethers';

import { AuthModule } from '../auth/auth.module';
import appConfig from '../common/config/app.config';
import { DatabaseModule } from '../database/database.module';
import { TransactionProvider } from '../database/database.providers';
import { WalletsModule } from '../wallets/wallets.module';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forFeature(appConfig),
    DatabaseModule,
    EthersModule.forRoot(),
    WalletsModule,
  ],
  providers: [TransactionProvider, TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
