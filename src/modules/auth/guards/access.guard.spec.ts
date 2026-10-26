import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '../../staff/staff.entity';
import { ACCOUNT_TYPE_KEY, ROLES_KEY } from '../decorators/auth.decorator';
import { AuthUser } from '../interfaces/auth-user.interface';
import { AccessGuard } from './access.guard';

const contextFor = (user: AuthUser): ExecutionContext =>
  ({
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

const guardWith = (type: string, roles: StaffRole[] = []) => {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key: unknown) =>
      key === ACCOUNT_TYPE_KEY ? type : key === ROLES_KEY ? roles : undefined,
    );
  return new AccessGuard(reflector);
};

const customer: AuthUser = { id: 1, type: 'customer', email: 'c@example.com' };
const clerk: AuthUser = { id: 2, type: 'staff', email: 's@shop.local', role: StaffRole.Staff };
const admin: AuthUser = { id: 3, type: 'staff', email: 'a@shop.local', role: StaffRole.Admin };

describe('AccessGuard', () => {
  it('blocks a customer token on a staff endpoint', () => {
    expect(() => guardWith('staff').canActivate(contextFor(customer))).toThrow(ForbiddenException);
  });

  it('blocks a staff token on a customer endpoint', () => {
    expect(() => guardWith('customer').canActivate(contextFor(clerk))).toThrow(ForbiddenException);
  });

  it('blocks a non-admin on an admin endpoint', () => {
    expect(() => guardWith('staff', [StaffRole.Admin]).canActivate(contextFor(clerk))).toThrow(
      ForbiddenException,
    );
  });

  it('allows an admin on an admin endpoint', () => {
    expect(guardWith('staff', [StaffRole.Admin]).canActivate(contextFor(admin))).toBe(true);
  });

  it('allows a customer on a customer endpoint', () => {
    expect(guardWith('customer').canActivate(contextFor(customer))).toBe(true);
  });
});
