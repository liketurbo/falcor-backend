import { ApiProperty } from '@nestjs/swagger';

export class ImportWalletResDto {
  @ApiProperty()
  accessToken: string;
}
