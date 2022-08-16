import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import serviceWalletsConfig from '../common/config/service-wallets.config';
import { DatabaseModule } from '../database/database.module';
import {
  TransactionProvider,
  WalletProvider,
} from '../database/database.providers';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forFeature(serviceWalletsConfig),
    DatabaseModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionProvider, WalletProvider],
})
export class TransactionsModule {}
