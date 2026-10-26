import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Customer } from './customer.entity';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private readonly customers: Repository<Customer>) {}

  async findAll(query: PaginationQueryDto) {
    const [data, total] = await this.customers.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginate(data, total, query);
  }

  async findOne(id: number) {
    const customer = await this.customers.findOneBy({ id });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
}
