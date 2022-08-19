import { ApiProperty } from '@nestjs/swagger';

export class WithdrawStakeDto {
  @ApiProperty()
  id: number;
}
