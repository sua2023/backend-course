import { hashPassword } from '../../common/utils/password';
import { slugify } from '../../common/utils/slugify';
import { Category } from '../../modules/categories/category.entity';
import { Product } from '../../modules/products/product.entity';
import { Staff, StaffRole } from '../../modules/staff/staff.entity';
import dataSource from '../data-source';

const CATALOG: Record<string, { name: string; price: number; stock: number }[]> = {
  Electronics: [
    { name: 'Wireless Mouse', price: 15.99, stock: 50 },
    { name: 'Mechanical Keyboard', price: 59.9, stock: 30 },
    { name: 'USB-C Hub', price: 24.5, stock: 40 },
  ],
  Books: [
    { name: 'Clean Code', price: 32, stock: 20 },
    { name: 'The Pragmatic Programmer', price: 41.25, stock: 15 },
  ],
  Home: [{ name: 'Coffee Mug', price: 8.75, stock: 100 }],
};

/** Safe to run more than once: it only adds what is missing. */
async function seed() {
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      const staffRepo = manager.getRepository(Staff);
      const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@shop.local').toLowerCase();
      if (!(await staffRepo.existsBy({ email }))) {
        await staffRepo.save(
          staffRepo.create({
            email,
            fullName: 'System Admin',
            role: StaffRole.Admin,
            passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345'),
          }),
        );
        console.log(`Created admin: ${email}`);
      }

      const categoryRepo = manager.getRepository(Category);
      const productRepo = manager.getRepository(Product);
      for (const [name, products] of Object.entries(CATALOG)) {
        const slug = slugify(name);
        if (await categoryRepo.existsBy({ slug })) continue;
        const category = await categoryRepo.save(categoryRepo.create({ name, slug }));
        await productRepo.save(
          products.map((p) => productRepo.create({ ...p, categoryId: category.id })),
        );
        console.log(`Created category ${name} with ${products.length} products`);
      }
    });
    console.log('Seed finished');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
