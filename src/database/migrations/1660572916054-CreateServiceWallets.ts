import { MigrationInterface, QueryRunner } from 'typeorm';
import serviceWalletsConfig from '../../common/config/service-wallets.config';
import { SERVICE_WALLET } from '../../wallets/constants/wallet-types.constants';

const serviceWallets = Object.entries(serviceWalletsConfig());

export class CreateServiceWallets1660572916054 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [id, wallet] of serviceWallets) {
      await queryRunner.query(
        `INSERT INTO "wallets"("pubkey", "mnemonic", "id", "type", "balance", "created_at") VALUES ($1, $2, $3, $4, DEFAULT, DEFAULT)`,
        [wallet.pubkey, wallet.mnemonic, id, SERVICE_WALLET],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [id] of serviceWallets) {
      await queryRunner.query(`DELETE FROM "wallets" WHERE "id" = $1`, [id]);
    }
  }
}
