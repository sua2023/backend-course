import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword, verifyPassword } from '../../common/utils/password';
import { Customer } from '../customers/customer.entity';
import { Staff } from '../staff/staff.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { JwtPayload } from './interfaces/auth-user.interface';

export interface AuthResponse<T> {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  account: T;
}

const INVALID_CREDENTIALS = 'Invalid email or password';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registerCustomer(dto: RegisterCustomerDto): Promise<AuthResponse<Customer>> {
    const email = dto.email.toLowerCase();
    if (await this.customers.existsBy({ email })) {
      throw new ConflictException('Email is already registered');
    }

    const customer = this.customers.create({
      email,
      fullName: dto.fullName,
      phone: dto.phone ?? null,
      passwordHash: await hashPassword(dto.password),
    });
    await this.customers.save(customer);
    return this.issueToken(customer, { sub: customer.id, type: 'customer' });
  }

  async loginCustomer(dto: LoginDto): Promise<AuthResponse<Customer>> {
    const customer = await this.customers
      .createQueryBuilder('customer')
      .addSelect('customer.passwordHash')
      .where('customer.email = :email', { email: dto.email.toLowerCase() })
      .getOne();

    // Same message for unknown email and wrong password, so emails cannot be probed.
    if (!customer || !(await verifyPassword(dto.password, customer.passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return this.issueToken(customer, { sub: customer.id, type: 'customer' });
  }

  async loginStaff(dto: LoginDto): Promise<AuthResponse<Staff>> {
    const member = await this.staff
      .createQueryBuilder('staff')
      .addSelect('staff.passwordHash')
      .where('staff.email = :email', { email: dto.email.toLowerCase() })
      .getOne();

    if (!member || !(await verifyPassword(dto.password, member.passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    if (!member.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }
    return this.issueToken(member, { sub: member.id, type: 'staff' });
  }

  async getCustomer(id: number): Promise<Customer> {
    const customer = await this.customers.findOneBy({ id });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async getStaff(id: number): Promise<Staff> {
    const member = await this.staff.findOneBy({ id });
    if (!member) throw new NotFoundException('Staff member not found');
    return member;
  }

  private async issueToken<T>(account: T, payload: JwtPayload): Promise<AuthResponse<T>> {
    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.get<number>('JWT_EXPIRES_IN', 3600),
      account,
    };
  }
}
