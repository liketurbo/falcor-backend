import { BadRequestException } from '@nestjs/common';

export class InvalidInterval extends BadRequestException {
  constructor() {
    super('Invalid interval provided');
  }
}
