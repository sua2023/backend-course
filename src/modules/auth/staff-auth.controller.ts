import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Auth } from './decorators/auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from './interfaces/auth-user.interface';

/** Staff cannot self-register: an admin creates them via POST /staff. */
@ApiTags('Auth: staff')
@Controller('auth/staff')
export class StaffAuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.loginStaff(dto);
  }

  @Get('me')
  @Auth('staff')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.getStaff(user.id);
  }
}
