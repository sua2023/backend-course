import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isDuplicateEntry } from '../../common/utils/db-errors';
import { slugify } from '../../common/utils/slugify';
import { Product } from '../products/product.entity';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  findAll() {
    return this.categories.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    const category = await this.categories.findOneBy({ id });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  create(dto: CreateCategoryDto) {
    return this.saveUnique(this.categories.create({ name: dto.name, slug: slugify(dto.name) }));
  }

  async update(id: number, dto: CreateCategoryDto) {
    const category = await this.findOne(id);
    category.name = dto.name;
    category.slug = slugify(dto.name);
    return this.saveUnique(category);
  }

  async remove(id: number) {
    const category = await this.findOne(id);
    if (await this.products.existsBy({ categoryId: id })) {
      throw new ConflictException('Category still has products; move or archive them first');
    }
    await this.categories.remove(category);
  }

  // The unique index is the real guard; checking first would still race.
  private async saveUnique(category: Category) {
    try {
      return await this.categories.save(category);
    } catch (error) {
      if (isDuplicateEntry(error)) throw new ConflictException('Category name already exists');
      throw error;
    }
  }
}
