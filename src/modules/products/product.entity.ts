import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { decimalTransformer } from '../../common/transformers/decimal.transformer';
import { Category } from '../categories/category.entity';

@Entity('products')
@Index('IDX_products_name', ['name'])
@Index('IDX_products_price', ['price'])
export class Product extends TimestampedEntity {
  @Column({ name: 'category_id' })
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.products, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id', foreignKeyConstraintName: 'FK_products_category' })
  category: Category;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
