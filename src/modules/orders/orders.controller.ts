import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/decorators/auth.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // ----- Customer: own orders only -----

  @Post()
  @Auth('customer')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Any unique string (e.g. a UUID). Sending the same key again returns the same order.',
  })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (
      idempotencyKey !== undefined &&
      (idempotencyKey.length < 1 || idempotencyKey.length > 100)
    ) {
      throw new BadRequestException('Idempotency-Key must be 1 to 100 characters');
    }
    return this.orders.create(user.id, dto, idempotencyKey);
  }

  @Get('me')
  @Auth('customer')
  findMine(@CurrentUser() user: AuthUser, @Query() query: QueryOrderDto) {
    return this.orders.findAll(query, user.id);
  }

  @Get('me/:id')
  @Auth('customer')
  findMineById(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.orders.findOne(id, user.id);
  }

  @Post('me/:id/cancel')
  @Auth('customer')
  cancelMine(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.orders.cancelByCustomer(id, user.id);
  }

  // ----- Staff: all orders -----

  @Get()
  @Auth('staff')
  findAll(@Query() query: QueryOrderDto) {
    return this.orders.findAll(query);
  }

  @Get(':id')
  @Auth('staff')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orders.findOne(id);
  }

  @Patch(':id/status')
  @Auth('staff')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }
}
