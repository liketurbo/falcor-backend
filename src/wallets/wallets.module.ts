import { Module } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { EthersModule } from 'nestjs-ethers';
import { DatabaseModule } from '../database/database.module';
import { WalletProvider } from '../database/database.providers';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, DatabaseModule, EthersModule.forRoot()],
  controllers: [WalletsController],
  providers: [JwtStrategy, WalletProvider],
})
export class WalletsModule {}
