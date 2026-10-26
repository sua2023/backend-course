import { ApiHideProperty } from '@nestjs/swagger';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { TimestampedEntity } from '../../common/entities/timestamped.entity';
import { Product } from '../products/product.entity';

@Entity('categories')
export class Category extends TimestampedEntity {
  @Index('UQ_categories_name', { unique: true })
  @Column({ length: 100 })
  name: string;

  @Index('UQ_categories_slug', { unique: true })
  @Column({ length: 120 })
  slug: string;

  @ApiHideProperty()
  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
