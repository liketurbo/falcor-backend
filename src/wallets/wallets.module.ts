import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EthersModule } from 'nestjs-ethers';

import { AuthModule } from '../auth/auth.module';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import appConfig from '../common/config/app.config';
import { DatabaseModule } from '../database/database.module';
import { WalletProvider } from '../database/database.providers';
import { TransactionsModule } from '../transactions/transactions.module';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forFeature(appConfig),
    DatabaseModule,
    EthersModule.forRoot(),
    TransactionsModule,
  ],
  controllers: [WalletsController],
  providers: [JwtStrategy, WalletProvider, WalletsService],
  exports: [WalletsService],
})
export class WalletsModule {}
