import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class InvalidInterval extends BadRequestException {
  constructor() {
    super('Invalid interval provided');
  }
}

export class NotFoundStake extends NotFoundException {
  constructor() {
    super('Stake not found');
  }
}

export class WithdrawNotAllowed extends ForbiddenException {
  constructor() {
    super('Withdraw is not allowed');
  }
}
