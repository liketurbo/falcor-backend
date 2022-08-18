import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Wallet } from '../database/entities/wallet.entity';
import { CreateWalletReqDto } from './dto/create-wallet-req.dto';
import { CreateWalletResDto } from './dto/create-wallet-res.dto';
import { FaucetDto } from './dto/faucet.dto';
import { ImportWalletReqDto } from './dto/import-wallet-req.dto';
import { ImportWalletResDto } from './dto/import-wallet-res.dto';
import { WalletsService } from './wallets.service';

@Controller('wallets')
@ApiTags('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly authService: AuthService,
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
    await this.walletsService.incrementBalance(body.pubkey, body.amount);
    return 'Ok';
  }

  @Get('pools')
  @ApiOkResponse({
    type: Wallet,
    isArray: true,
  })
  async getPools(): Promise<Wallet[]> {
    const pools = [
      this.walletsService.getById('1'),
      this.walletsService.getById('2'),
      this.walletsService.getById('3'),
      this.walletsService.getById('4'),
    ];
    return Promise.all(pools);
  }
}
