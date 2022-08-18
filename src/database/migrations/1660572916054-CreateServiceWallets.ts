import { MigrationInterface, QueryRunner } from 'typeorm';

import appConfig from '../../common/config/app.config';
import { SERVICE_WALLET } from '../../wallets/constants/wallet-types.constants';

const { serviceWallets } = appConfig();

export class CreateServiceWallets1660572916054 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const serviceWallet of serviceWallets) {
      await queryRunner.query(
        `INSERT INTO "wallets"("pubkey", "mnemonic", "name", "type", "balance", "created_at") VALUES ($1, $2, $3, $4, DEFAULT, DEFAULT)`,
        [
          serviceWallet.pubkey,
          serviceWallet.mnemonic,
          serviceWallet.name,
          SERVICE_WALLET,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const serviceWallet of serviceWallets) {
      await queryRunner.query(`DELETE FROM "wallets" WHERE "name" = $1`, [
        serviceWallet.name,
      ]);
    }
  }
}
