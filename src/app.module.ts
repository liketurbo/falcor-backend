import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { EthersModule } from 'nestjs-ethers';
import { DatabaseModule } from './database/database.module';
import {
  TransactionProvider,
  WalletProvider,
} from './database/database.providers';
import { ConfigModule } from '@nestjs/config';
import serviceWalletsConfig from './config/service-wallets.config';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    EthersModule.forRoot(),
    DatabaseModule,
    ConfigModule.forFeature(serviceWalletsConfig),
    JwtModule.register({
      secret: 'hard!to-guess_secret',
    }),
  ],
  controllers: [AppController],
  providers: [WalletProvider, TransactionProvider, JwtStrategy],
})
export class AppModule {}
