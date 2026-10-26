import { StaffRole } from '../../staff/staff.entity';

/** Customers and staff live in different tables, so the token says which one `sub` points to. */
export type AccountType = 'customer' | 'staff';

export interface JwtPayload {
  sub: number;
  type: AccountType;
}

/** What JwtStrategy puts on request.user. */
export interface AuthUser {
  id: number;
  type: AccountType;
  email: string;
  role?: StaffRole;
}
