import { Module } from '@nestjs/common';
import { WalletsModule } from './wallets/wallets.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [WalletsModule, AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
