import { ApiProperty } from '@nestjs/swagger';

export class SendTransactionDto {
  @ApiProperty()
  to: string;

  @ApiProperty()
  amount: number;
}
