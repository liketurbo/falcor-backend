import { ApiProperty } from '@nestjs/swagger';

export class SendDto {
  @ApiProperty()
  from: string;

  @ApiProperty()
  to: string;

  @ApiProperty()
  amount: number;
}
