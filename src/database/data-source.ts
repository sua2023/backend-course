import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from '../config/database.config';

// Used by the TypeORM CLI (npm run migration:*) and the seed script.
export default new DataSource(databaseOptions((key) => process.env[key]));
