import { ApiProperty } from '@nestjs/swagger';
import { ArrayContains, IsPositive } from 'class-validator';

import {
  INTERVAL_3_MONTHS,
  INTERVAL_6_MONTHS,
  INTERVAL_9_MONTHS,
} from '../constants/intervals.constants';

export class CreateStakeDto {
  @ArrayContains([INTERVAL_3_MONTHS, INTERVAL_6_MONTHS, INTERVAL_9_MONTHS])
  @ApiProperty()
  period: string;

  @IsPositive()
  @ApiProperty()
  amount: number;
}
