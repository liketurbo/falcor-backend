import serviceWalletsConfig from './config/service-wallets.config';
import {
  PERSONAL_WALLET,
  SERVICE_WALLET,
} from './constants/wallet-types.constants';

export interface RandomWallet {
  address: string;
  pubkey: string;
  mnemonic: string;
}

export type ServiceWalletsVariables = ReturnType<typeof serviceWalletsConfig>;

export type WalletType = typeof SERVICE_WALLET | typeof PERSONAL_WALLET;
