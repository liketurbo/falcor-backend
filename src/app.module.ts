import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EthersModule } from 'nestjs-ethers';
import { DatabaseModule } from './database/database.module';
import { WalletProvider } from './database/database.providers';

@Module({
  imports: [EthersModule.forRoot(), DatabaseModule],
  controllers: [AppController],
  providers: [WalletProvider, AppService],
})
export class AppModule {}
