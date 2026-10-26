import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { Order } from '../orders/entities/order.entity';

/** People who shop. Separate from staff: different table, login and token type. */
@Entity('customers')
export class Customer extends TimestampedEntity {
  @Index('UQ_customers_email', { unique: true })
  @Column({ length: 255 })
  email: string;

  @ApiHideProperty()
  @Exclude()
  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'full_name', length: 120 })
  fullName: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @ApiHideProperty()
  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];
}
