import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EthersModule } from 'nestjs-ethers';

@Module({
  imports: [EthersModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
