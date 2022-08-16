import { Module } from '@nestjs/common';
import { EthersModule } from 'nestjs-ethers';

import { AuthModule } from '../auth/auth.module';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { DatabaseModule } from '../database/database.module';
import { WalletProvider } from '../database/database.providers';
import { WalletsController } from './wallets.controller';

@Module({
  imports: [AuthModule, DatabaseModule, EthersModule.forRoot()],
  controllers: [WalletsController],
  providers: [JwtStrategy, WalletProvider],
})
export class WalletsModule {}
