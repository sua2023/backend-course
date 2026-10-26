import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TimestampedEntity } from '../../../common/entities/timestamped.entity';
import { decimalTransformer } from '../../../common/transformers/decimal.transformer';
import { Customer } from '../../customers/customer.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  Pending = 'pending',
  Paid = 'paid',
  Shipped = 'shipped',
  Cancelled = 'cancelled',
}

@Entity('orders')
// One order per (customer, Idempotency-Key): a retried request cannot create a second order.
@Index('UQ_orders_customer_idempotency', ['customerId', 'idempotencyKey'], { unique: true })
export class Order extends TimestampedEntity {
  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => Customer, (customer) => customer.orders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'FK_orders_customer' })
  customer: Customer;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.Pending })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer })
  total: number;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
  idempotencyKey: string | null;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert'] })
  items: OrderItem[];
}
