import { ApiProperty } from '@nestjs/swagger';

export class FaucetDto {
  @ApiProperty()
  pubkey: string;

  @ApiProperty()
  amount: number;
}
