import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '../../staff/staff.entity';
import { ACCOUNT_TYPE_KEY, ROLES_KEY } from '../decorators/auth.decorator';
import { AccountType, AuthUser } from '../interfaces/auth-user.interface';

/** Runs after JwtAuthGuard: checks account type (customer / staff), then staff role. */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const type = this.reflector.getAllAndOverride<AccountType | undefined>(
      ACCOUNT_TYPE_KEY,
      targets,
    );
    const roles =
      this.reflector.getAllAndOverride<StaffRole[] | undefined>(ROLES_KEY, targets) ?? [];
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;

    if (!user) throw new UnauthorizedException();
    if (type && user.type !== type) {
      throw new ForbiddenException(`Only ${type} accounts can use this endpoint`);
    }
    if (roles.length > 0 && (!user.role || !roles.includes(user.role))) {
      throw new ForbiddenException(`Requires role: ${roles.join(' or ')}`);
    }
    return true;
  }
}
