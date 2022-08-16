import { ApiProperty } from '@nestjs/swagger';

export class SendDto {
  @ApiProperty()
  to: string;

  @ApiProperty()
  amount: number;
}
