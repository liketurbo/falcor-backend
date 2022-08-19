import { ForbiddenException, NotFoundException } from '@nestjs/common';

export class NotFoundWallet extends NotFoundException {
  constructor() {
    super('Wallet not found');
  }
}

export class InsufficientBalance extends ForbiddenException {
  constructor() {
    super('Insufficient balance');
  }
}
