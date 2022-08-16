import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  login(pubkey: string) {
    return {
      accessToken: this.jwtService.sign({ pubkey }),
    };
  }

  validate(accessToken: string) {
    const decoded = this.jwtService.decode(accessToken) as Record<
      string,
      string
    >;
    return decoded.pubkey;
  }
}
