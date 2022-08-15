import { DataSource } from 'typeorm';
import path from 'path';
import { Wallet } from './entities/wallet.entity';
import {
  DATA_SOURCE,
  TRANSACTION_REPOSITORY,
  WALLET_REPOSITORY,
} from './constants/db-ids.constants';
import { Transaction } from './entities/transaction.entity';

export const databaseProviders = [
  {
    provide: DATA_SOURCE,
    async useFactory() {
      const dataSource = new DataSource({
        type: 'postgres',
        host: 'pg',
        port: 5432,
        username: 'postgres',
        password: 'example',
        database: 'postgres',
        synchronize: true,
        logging: true,
        entities: [path.join(__dirname, 'entities/*.entity{.ts,.js}')],
        migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
        subscribers: [],
      });

      await dataSource.initialize();
      await dataSource.runMigrations();

      return dataSource;
    },
  },
];

export const WalletProvider = {
  provide: WALLET_REPOSITORY,
  useFactory: (dataSource: DataSource) => dataSource.getRepository(Wallet),
  inject: [DATA_SOURCE],
};

export const TransactionProvider = {
  provide: TRANSACTION_REPOSITORY,
  useFactory: (dataSource: DataSource) => dataSource.getRepository(Transaction),
  inject: [DATA_SOURCE],
};
