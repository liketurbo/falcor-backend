import { MigrationInterface, QueryRunner } from 'typeorm';

import { STAKING_WALLET } from '../../common/constants/service-wallets-names.constants';

export class GiveOneBillionToStakeWallet1660922875345
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.query(
      'UPDATE wallets SET balance = balance + 1000000000 WHERE name = $1',
      [STAKING_WALLET],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.query(
      'UPDATE wallets SET balance = balance - 1000000000 WHERE name = $1',
      [STAKING_WALLET],
    );
  }
}
