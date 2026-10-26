import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { CustomersService } from './customers.service';

/** Customer records for staff. A customer reads their own profile via /auth/customer/me. */
@ApiTags('Customers (staff)')
@Auth('staff')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.customers.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customers.findOne(id);
  }
}
