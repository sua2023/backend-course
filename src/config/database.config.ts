import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

type EnvGetter = (key: string) => unknown;

/**
 * One place for connection settings, shared by the Nest app and the TypeORM CLI
 * (migrations, seed). Globs match .ts under ts-node and .js in dist/.
 */
export function databaseOptions(get: EnvGetter): DataSourceOptions {
  return {
    type: 'mysql',
    host: String(get('DB_HOST') ?? 'localhost'),
    port: Number(get('DB_PORT') ?? 3306),
    username: String(get('DB_USER') ?? 'root'),
    password: String(get('DB_PASSWORD') ?? ''),
    database: String(get('DB_NAME') ?? 'backend-course'),
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    // Never true: every schema change goes through a migration.
    synchronize: false,
    charset: 'utf8mb4',
    timezone: 'Z',
  };
}
