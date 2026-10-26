import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1761200000000 implements MigrationInterface {
  name = 'InitSchema1761200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`customers\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`email\` varchar(255) NOT NULL,
        \`password_hash\` varchar(255) NOT NULL,
        \`full_name\` varchar(120) NOT NULL,
        \`phone\` varchar(30) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_customers_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
      CREATE TABLE \`staff\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`email\` varchar(255) NOT NULL,
        \`password_hash\` varchar(255) NOT NULL,
        \`full_name\` varchar(120) NOT NULL,
        \`role\` enum('admin', 'staff') NOT NULL DEFAULT 'staff',
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_staff_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
      CREATE TABLE \`categories\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(100) NOT NULL,
        \`slug\` varchar(120) NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_categories_name\` (\`name\`),
        UNIQUE INDEX \`UQ_categories_slug\` (\`slug\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
      CREATE TABLE \`products\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`category_id\` int NOT NULL,
        \`name\` varchar(200) NOT NULL,
        \`description\` text NULL,
        \`price\` decimal(10,2) NOT NULL,
        \`stock\` int NOT NULL DEFAULT 0,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_products_name\` (\`name\`),
        INDEX \`IDX_products_price\` (\`price\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_products_category\` FOREIGN KEY (\`category_id\`)
          REFERENCES \`categories\` (\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
      CREATE TABLE \`orders\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`customer_id\` int NOT NULL,
        \`status\` enum('pending', 'paid', 'shipped', 'cancelled') NOT NULL DEFAULT 'pending',
        \`total\` decimal(10,2) NOT NULL,
        \`idempotency_key\` varchar(100) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_orders_customer_idempotency\` (\`customer_id\`, \`idempotency_key\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_orders_customer\` FOREIGN KEY (\`customer_id\`)
          REFERENCES \`customers\` (\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await queryRunner.query(`
      CREATE TABLE \`order_items\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`order_id\` int NOT NULL,
        \`product_id\` int NOT NULL,
        \`quantity\` int NOT NULL,
        \`unit_price\` decimal(10,2) NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_order_items_order\` FOREIGN KEY (\`order_id\`)
          REFERENCES \`orders\` (\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_order_items_product\` FOREIGN KEY (\`product_id\`)
          REFERENCES \`products\` (\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `order_items`');
    await queryRunner.query('DROP TABLE `orders`');
    await queryRunner.query('DROP TABLE `products`');
    await queryRunner.query('DROP TABLE `categories`');
    await queryRunner.query('DROP TABLE `staff`');
    await queryRunner.query('DROP TABLE `customers`');
  }
}
