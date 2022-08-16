import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { StakeProvider } from '../database/database.providers';
import { StakingController } from './staking.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [StakingController],
  providers: [StakeProvider],
})
export class StakingModule {}
