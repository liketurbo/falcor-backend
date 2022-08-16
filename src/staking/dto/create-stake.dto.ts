import { ApiProperty } from '@nestjs/swagger';

export class CreateStakeDto {
  @ApiProperty()
  period: string;

  @ApiProperty()
  amount: number;
}
