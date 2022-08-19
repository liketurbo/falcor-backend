import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Transaction } from '../database/entities/transaction.entity';
import { Wallet } from '../database/entities/wallet.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { AppVariables } from '../types';
import { CreateWalletReqDto } from './dto/create-wallet-req.dto';
import { CreateWalletResDto } from './dto/create-wallet-res.dto';
import { FaucetDto } from './dto/faucet.dto';
import { ImportWalletReqDto } from './dto/import-wallet-req.dto';
import { ImportWalletResDto } from './dto/import-wallet-res.dto';
import { SendTransactionDto } from './dto/send-transaction.dto';
import { WalletsService } from './wallets.service';

@Controller('wallets')
@ApiTags('wallets')
export class WalletsController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppVariables>,
    private readonly walletsService: WalletsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @Post('create')
  @ApiCreatedResponse({
    type: CreateWalletResDto,
  })
  async createWallet(
    @Body() { password }: CreateWalletReqDto,
  ): Promise<CreateWalletResDto> {
    const draftWallet = await this.walletsService.createDraft(password);
    await this.walletsService.save({
      pubkey: draftWallet.pubkey,
      keystore: draftWallet.keystore,
    });
    const { accessToken } = this.authService.login(draftWallet.pubkey);
    return {
      mnemonic: draftWallet.mnemonic,
      accessToken,
    };
  }

  @Put('import')
  async importWallet(
    @Body() { mnemonic, password }: ImportWalletReqDto,
  ): Promise<ImportWalletResDto> {
    const importedWallet = await this.walletsService.import(mnemonic);
    await this.walletsService.changePassword(importedWallet.mnemonic, password);
    const { accessToken } = this.authService.login(importedWallet.pubkey);
    return {
      accessToken,
    };
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getCurrent(@Request() req): Promise<Wallet> {
    const { pubkey } = req.user;
    return this.walletsService.getByPubkey(pubkey);
  }

  @Put('faucet')
  @ApiAcceptedResponse({
    type: String,
  })
  async faucet(@Body() body: FaucetDto): Promise<string> {
    await this.walletsService.increaseBalance(body.pubkey, body.amount);
    return 'Ok';
  }

  @Get('pools')
  @ApiOkResponse({
    type: Wallet,
    isArray: true,
  })
  async getPools(): Promise<Wallet[]> {
    const pools = [];
    const serviceWallets =
      this.config.get<AppVariables['serviceWallets']>('serviceWallets');
    serviceWallets.forEach((w) =>
      pools.push(this.walletsService.getByPubkey(w.pubkey)),
    );
    return Promise.all(pools);
  }

  @Post('send')
  @ApiOkResponse({
    type: Transaction,
    isArray: true,
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async send(
    @Request() req,
    @Body() body: SendTransactionDto,
  ): Promise<Transaction[]> {
    const { pubkey } = req.user;
    const queryRunner = await this.transactionsService.start();
    const transactions: Transaction[] = [];
    const { commissionAmount, leftAmount } =
      this.transactionsService.calcCommission(body.amount);
    transactions.push(
      await this.transactionsService.sendBetween(queryRunner, {
        from: pubkey,
        to: body.to,
        amount: leftAmount,
      }),
    );
    transactions.push(
      ...(await this.transactionsService.sendCommissions(queryRunner, {
        from: pubkey,
        amount: commissionAmount,
      })),
    );
    await this.transactionsService.finish(queryRunner);
    return transactions;
  }
}
