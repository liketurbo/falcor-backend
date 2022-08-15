import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EthersModule } from 'nestjs-ethers';
import { DatabaseModule } from './database/database.module';
import {
  TransactionProvider,
  WalletProvider,
} from './database/database.providers';
import { ConfigModule } from '@nestjs/config';
import serviceWalletsConfig from './config/service-wallets.config';

@Module({
  imports: [
    EthersModule.forRoot(),
    DatabaseModule,
    ConfigModule.forFeature(serviceWalletsConfig),
  ],
  controllers: [AppController],
  providers: [WalletProvider, TransactionProvider, AppService],
})
export class AppModule {}
