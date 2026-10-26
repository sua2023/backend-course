import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination-query.dto';
import { Category } from '../categories/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductSort, QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './product.entity';

// Whitelist: user input never goes into ORDER BY directly.
const SORT_COLUMNS: Record<ProductSort, [string, 'ASC' | 'DESC']> = {
  'createdAt:desc': ['product.createdAt', 'DESC'],
  'price:asc': ['product.price', 'ASC'],
  'price:desc': ['product.price', 'DESC'],
  'name:asc': ['product.name', 'ASC'],
  'name:desc': ['product.name', 'DESC'],
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
  ) {}

  /** Public catalog: active products only. */
  async findAll(query: QueryProductDto) {
    const qb = this.products
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.isActive = :active', { active: true });

    if (query.search) qb.andWhere('product.name LIKE :search', { search: `%${query.search}%` });
    if (query.categoryId)
      qb.andWhere('product.categoryId = :categoryId', { categoryId: query.categoryId });
    if (query.minPrice !== undefined)
      qb.andWhere('product.price >= :minPrice', { minPrice: query.minPrice });
    if (query.maxPrice !== undefined)
      qb.andWhere('product.price <= :maxPrice', { maxPrice: query.maxPrice });

    const [column, direction] = SORT_COLUMNS[query.sort];
    const [data, total] = await qb
      .orderBy(column, direction)
      .addOrderBy('product.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return paginate(data, total, query);
  }

  async findOne(id: number) {
    const product = await this.products.findOne({
      where: { id, isActive: true },
      relations: { category: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    await this.assertCategoryExists(dto.categoryId);
    return this.products.save(this.products.create(dto));
  }

  async update(id: number, dto: UpdateProductDto) {
    const product = await this.products.findOneBy({ id });
    if (!product) throw new NotFoundException('Product not found');
    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);
    Object.assign(product, dto);
    return this.products.save(product);
  }

  /** Archive instead of delete: old orders still point at the product. */
  async archive(id: number) {
    const result = await this.products.update(id, { isActive: false });
    if (!result.affected) throw new NotFoundException('Product not found');
  }

  private async assertCategoryExists(categoryId: number) {
    if (!(await this.categories.existsBy({ id: categoryId }))) {
      throw new BadRequestException(`Category ${categoryId} does not exist`);
    }
  }
}
