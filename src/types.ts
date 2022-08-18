import appConfig from './common/config/app.config';
import {
  PERSONAL_WALLET,
  SERVICE_WALLET,
} from './wallets/constants/wallet-types.constants';

export type AppVariables = ReturnType<typeof appConfig>;

export type WalletType = typeof SERVICE_WALLET | typeof PERSONAL_WALLET;

export type PublicKey = string;
