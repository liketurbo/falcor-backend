import { ApiProperty } from '@nestjs/swagger';

export class ImportWalletReqDto {
  @ApiProperty()
  mnemonic: string;

  @ApiProperty()
  password: string;
}
