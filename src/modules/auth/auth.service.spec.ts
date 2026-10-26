import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { instanceToPlain } from 'class-transformer';
import { hashPassword, verifyPassword } from '../../common/utils/password';
import { Customer } from '../customers/customer.entity';
import { Staff, StaffRole } from '../staff/staff.entity';
import { AuthService } from './auth.service';

/** A fake query builder whose getOne() resolves to `result`. */
const queryBuilder = (result: unknown) => ({
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(result),
});

describe('AuthService', () => {
  let service: AuthService;

  const customers = {
    existsBy: jest.fn(),
    create: jest.fn((data: Partial<Customer>) => Object.assign(new Customer(), data)),
    save: jest.fn(async (customer: Customer) => Object.assign(customer, { id: 1 })),
    createQueryBuilder: jest.fn(),
  };
  const staff = { createQueryBuilder: jest.fn() };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
  const config = { get: jest.fn().mockReturnValue(3600) };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Customer), useValue: customers },
        { provide: getRepositoryToken(Staff), useValue: staff },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('registerCustomer', () => {
    it('stores a lowercase email and a bcrypt hash, never the plain password', async () => {
      customers.existsBy.mockResolvedValue(false);

      const result = await service.registerCustomer({
        email: 'Ana@Example.com',
        password: 'Secret123',
        fullName: 'Ana',
      });

      const saved = customers.save.mock.calls[0][0];
      expect(saved.email).toBe('ana@example.com');
      expect(saved.passwordHash).not.toBe('Secret123');
      expect(await verifyPassword('Secret123', saved.passwordHash)).toBe(true);
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 1, type: 'customer' });
      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('does not expose passwordHash in the serialized response', async () => {
      customers.existsBy.mockResolvedValue(false);
      const result = await service.registerCustomer({
        email: 'ana@example.com',
        password: 'Secret123',
        fullName: 'Ana',
      });
      expect(instanceToPlain(result).account).not.toHaveProperty('passwordHash');
    });

    it('rejects an email that is already registered', async () => {
      customers.existsBy.mockResolvedValue(true);
      await expect(
        service.registerCustomer({
          email: 'ana@example.com',
          password: 'Secret123',
          fullName: 'Ana',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('loginCustomer', () => {
    it('rejects a wrong password with a generic message', async () => {
      const customer = Object.assign(new Customer(), {
        id: 1,
        email: 'ana@example.com',
        passwordHash: await hashPassword('Secret123'),
      });
      customers.createQueryBuilder.mockReturnValue(queryBuilder(customer));

      await expect(
        service.loginCustomer({ email: 'ana@example.com', password: 'Wrong999' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('rejects an unknown email with the same message', async () => {
      customers.createQueryBuilder.mockReturnValue(queryBuilder(null));
      await expect(
        service.loginCustomer({ email: 'nobody@example.com', password: 'Secret123' }),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('loginStaff', () => {
    const makeStaff = async (isActive: boolean) =>
      Object.assign(new Staff(), {
        id: 7,
        email: 'admin@shop.local',
        role: StaffRole.Admin,
        isActive,
        passwordHash: await hashPassword('Admin@12345'),
      });

    it('issues a staff token', async () => {
      staff.createQueryBuilder.mockReturnValue(queryBuilder(await makeStaff(true)));
      const result = await service.loginStaff({
        email: 'admin@shop.local',
        password: 'Admin@12345',
      });
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 7, type: 'staff' });
      expect(result.account.role).toBe(StaffRole.Admin);
    });

    it('rejects a disabled staff account', async () => {
      staff.createQueryBuilder.mockReturnValue(queryBuilder(await makeStaff(false)));
      await expect(
        service.loginStaff({ email: 'admin@shop.local', password: 'Admin@12345' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
