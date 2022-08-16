import { ApiProperty } from '@nestjs/swagger';

export class CreateWalletReqDto {
  @ApiProperty()
  password: string;
}
