import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  /** 200 when the API and MySQL are up, 503 otherwise. Used by Docker and load balancers. */
  @Get()
  @HealthCheck()
  @SkipThrottle()
  check() {
    return this.health.check([() => this.db.pingCheck('database', { timeout: 1500 })]);
  }
}
