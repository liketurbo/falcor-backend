import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
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
import { EthersSigner, InjectSignerProvider } from 'nestjs-ethers';
import { DataSource, Repository } from 'typeorm';

import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DATA_SOURCE,
  WALLET_REPOSITORY,
} from '../database/constants/db-ids.constants';
import { Wallet } from '../database/entities/wallet.entity';
import { SERVICE_WALLET } from './constants/wallet-types.constants';
import { CreateWalletReqDto } from './dto/create-wallet-req.dto';
import { CreateWalletResDto } from './dto/create-wallet-res.dto';
import { FaucetDto } from './dto/faucet.dto';
import { ImportWalletReqDto } from './dto/import-wallet-req.dto';

@Controller('wallets')
@ApiTags('wallets')
export class WalletsController {
  constructor(
    @Inject(DATA_SOURCE)
    private readonly dbConnection: DataSource,
    @Inject(WALLET_REPOSITORY)
    private readonly walletsRepository: Repository<Wallet>,
    @InjectSignerProvider()
    private readonly ethersSigner: EthersSigner,
    private readonly authService: AuthService,
  ) {}

  @Post('create')
  @ApiCreatedResponse({
    type: CreateWalletResDto,
  })
  async createWallet(
    @Body() { password }: CreateWalletReqDto,
  ): Promise<CreateWalletResDto> {
    const randomWallet = this.ethersSigner.createRandomWallet();
    await this.walletsRepository.save({
      pubkey: randomWallet.publicKey,
      keystore: await randomWallet.encrypt(password),
    });
    const { accessToken } = this.authService.login(randomWallet.publicKey);
    return {
      mnemonic: randomWallet.mnemonic.phrase,
      accessToken,
    };
  }

  @Put('import')
  async importWallet(@Body() { mnemonic, password }: ImportWalletReqDto) {
    const restoredWallet = this.ethersSigner.createWalletfromMnemonic(mnemonic);

    const foundWallet = await this.walletsRepository.findOneBy({
      pubkey: restoredWallet.publicKey,
    });
    if (!foundWallet) return new NotFoundException('Wallet not found');

    await this.walletsRepository.update(
      {
        pubkey: restoredWallet.publicKey,
      },
      {
        keystore: await restoredWallet.encrypt(password),
      },
    );

    const { accessToken } = this.authService.login(restoredWallet.publicKey);

    return {
      accessToken,
    };
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getCurrent(@Request() req) {
    const { pubkey } = req.user;
    return this.walletsRepository.findOneByOrFail({
      pubkey,
    });
  }

  @Put('faucet')
  @ApiAcceptedResponse({
    type: String,
  })
  async faucet(@Body() body: FaucetDto): Promise<string> {
    await this.walletsRepository.increment(
      {
        pubkey: body.pubkey,
      },
      'balance',
      body.amount,
    );
    return 'Ok';
  }

  @Get('pools')
  @ApiOkResponse({
    type: Wallet,
    isArray: true,
  })
  async getPools() {
    return this.walletsRepository.findBy({
      type: SERVICE_WALLET,
    });
  }
}
