import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EthersModule } from 'nestjs-ethers';

import { AuthModule } from '../auth/auth.module';
import appConfig from '../common/config/app.config';
import { DatabaseModule } from '../database/database.module';
import {
  TransactionProvider,
  WalletProvider,
} from '../database/database.providers';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forFeature(appConfig),
    DatabaseModule,
    EthersModule.forRoot(),
  ],
  providers: [TransactionProvider, TransactionsService, WalletProvider],
  exports: [TransactionsService],
})
export class TransactionsModule {}
