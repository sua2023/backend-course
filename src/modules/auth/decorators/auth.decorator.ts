import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { StaffRole } from '../../staff/staff.entity';
import { AccessGuard } from '../guards/access.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AccountType } from '../interfaces/auth-user.interface';

export const ACCOUNT_TYPE_KEY = 'auth:accountType';
export const ROLES_KEY = 'auth:roles';

/**
 * @Auth('customer')                 any logged-in customer
 * @Auth('staff')                    any active staff member
 * @Auth('staff', StaffRole.Admin)   admins only
 */
export function Auth(type: AccountType, ...roles: StaffRole[]) {
  return applyDecorators(
    SetMetadata(ACCOUNT_TYPE_KEY, type),
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, AccessGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Missing, invalid or expired token' }),
    ApiForbiddenResponse({ description: 'Wrong account type or role' }),
  );
}
