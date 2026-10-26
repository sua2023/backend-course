import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination-query.dto';
import { isDuplicateEntry } from '../../common/utils/db-errors';
import { Product } from '../products/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';

/** Allowed status changes. Anything not listed is rejected. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Paid, OrderStatus.Cancelled],
  [OrderStatus.Paid]: [OrderStatus.Shipped, OrderStatus.Cancelled],
  [OrderStatus.Shipped]: [],
  [OrderStatus.Cancelled]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Places an order in one transaction: lock the product rows, check stock, subtract stock,
   * insert the order and its items. Any failure rolls everything back.
   * With an Idempotency-Key, a retried request returns the first order instead of a new one.
   */
  async create(customerId: number, dto: CreateOrderDto, idempotencyKey?: string): Promise<Order> {
    if (idempotencyKey) {
      const existing = await this.orders.findOneBy({ customerId, idempotencyKey });
      if (existing) return this.findOne(existing.id, customerId);
    }

    // The same product twice in one request becomes one line.
    const quantities = new Map<number, number>();
    for (const item of dto.items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    const productIds = [...quantities.keys()];

    let orderId: number;
    try {
      orderId = await this.dataSource.transaction(async (manager) => {
        const productRepo = manager.getRepository(Product);

        // FOR UPDATE: two customers buying the last item wait for each other instead of overselling.
        const products = await productRepo.find({
          where: { id: In(productIds), isActive: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (products.length !== productIds.length) {
          const found = new Set(products.map((p) => p.id));
          const missing = productIds.filter((id) => !found.has(id));
          throw new NotFoundException(`Products not found or unavailable: ${missing.join(', ')}`);
        }

        let totalCents = 0;
        const items: OrderItem[] = [];
        for (const product of products) {
          const quantity = quantities.get(product.id)!;
          if (product.stock < quantity) {
            throw new ConflictException(
              `Not enough stock for "${product.name}" (available ${product.stock}, requested ${quantity})`,
            );
          }
          await productRepo.decrement({ id: product.id }, 'stock', quantity);
          // Integer cents avoid floating-point errors such as 0.1 + 0.2.
          totalCents += Math.round(product.price * 100) * quantity;
          items.push(
            manager.create(OrderItem, {
              productId: product.id,
              quantity,
              unitPrice: product.price,
            }),
          );
        }

        const order = await manager.save(
          manager.create(Order, {
            customerId,
            status: OrderStatus.Pending,
            total: totalCents / 100,
            idempotencyKey: idempotencyKey ?? null,
            items,
          }),
        );
        return order.id;
      });
    } catch (error) {
      // Two identical requests at the same moment: the unique index lets one win.
      if (idempotencyKey && isDuplicateEntry(error)) {
        const existing = await this.orders.findOneBy({ customerId, idempotencyKey });
        if (existing) return this.findOne(existing.id, customerId);
      }
      throw error;
    }

    return this.findOne(orderId, customerId);
  }

  async findAll(query: QueryOrderDto, customerId?: number) {
    const where: FindOptionsWhere<Order> = {};
    if (query.status) where.status = query.status;
    // A customer always sees only their own orders, whatever the query says.
    const owner = customerId ?? query.customerId;
    if (owner) where.customerId = owner;

    const [data, total] = await this.orders.findAndCount({
      where,
      relations: { items: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginate(data, total, query);
  }

  /** With customerId, someone else's order is "not found" (404), so ids cannot be probed. */
  async findOne(id: number, customerId?: number): Promise<Order> {
    const order = await this.orders.findOne({
      where: customerId ? { id, customerId } : { id },
      relations: { items: { product: true }, customer: !customerId },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  updateStatus(id: number, status: OrderStatus) {
    return this.changeStatus(id, status);
  }

  /** Customers may cancel their own order until it ships. */
  cancelByCustomer(id: number, customerId: number) {
    return this.changeStatus(id, OrderStatus.Cancelled, customerId);
  }

  private async changeStatus(id: number, status: OrderStatus, customerId?: number) {
    await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Order);
      const order = await orderRepo.findOne({
        where: customerId ? { id, customerId } : { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (!TRANSITIONS[order.status].includes(status)) {
        throw new BadRequestException(`Cannot change order from ${order.status} to ${status}`);
      }

      if (status === OrderStatus.Cancelled) {
        const items = await manager.getRepository(OrderItem).findBy({ orderId: id });
        for (const item of items) {
          await manager
            .getRepository(Product)
            .increment({ id: item.productId }, 'stock', item.quantity);
        }
      }
      await orderRepo.update(id, { status });
    });
    return this.findOne(id, customerId);
  }
}
