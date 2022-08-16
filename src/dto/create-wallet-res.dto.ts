import { ApiProperty } from '@nestjs/swagger';

export class CreateWalletResDto {
  @ApiProperty()
  mnemonic: string;

  @ApiProperty()
  jwt: string;
}
