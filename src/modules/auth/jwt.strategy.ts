import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { Staff } from '../staff/staff.entity';
import { AuthUser, JwtPayload } from './interfaces/auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Runs after the signature and expiry are verified. Loading the account again means a
   * deleted customer or a disabled staff member is locked out at once, and a staff role
   * change applies on the next request instead of when the token expires.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.type === 'customer') {
      const customer = await this.customers.findOneBy({ id: payload.sub });
      if (!customer) throw new UnauthorizedException();
      return { id: customer.id, type: 'customer', email: customer.email };
    }

    if (payload.type === 'staff') {
      const member = await this.staff.findOneBy({ id: payload.sub });
      if (!member || !member.isActive) throw new UnauthorizedException();
      return { id: member.id, type: 'staff', email: member.email, role: member.role };
    }

    throw new UnauthorizedException();
  }
}
