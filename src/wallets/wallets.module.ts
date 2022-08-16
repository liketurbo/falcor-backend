import { Module } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { EthersModule } from 'nestjs-ethers';
import { DatabaseModule } from '../database/database.module';
import {
  TransactionProvider,
  WalletProvider,
} from '../database/database.providers';
import { ConfigModule } from '@nestjs/config';
import serviceWalletsConfig from './config/service-wallets.config';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    EthersModule.forRoot(),
    DatabaseModule,
    ConfigModule.forFeature(serviceWalletsConfig),
    AuthModule,
  ],
  controllers: [WalletsController],
  providers: [WalletProvider, TransactionProvider, JwtStrategy],
})
export class WalletsModule {}
