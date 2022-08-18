import { Module } from '@nestjs/common';
import { EthersModule } from 'nestjs-ethers';

import { AuthModule } from '../auth/auth.module';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { DatabaseModule } from '../database/database.module';
import { WalletProvider } from '../database/database.providers';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [AuthModule, DatabaseModule, EthersModule.forRoot()],
  controllers: [WalletsController],
  providers: [JwtStrategy, WalletProvider, WalletsService],
})
export class WalletsModule {}
